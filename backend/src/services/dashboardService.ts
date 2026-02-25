import { Prisma } from '@prisma/client';
import prisma from '../prisma/client.js';

export type DashboardGranularity = 'day' | 'week';

export type DashboardFilters = {
  start: Date;
  end: Date;
  granularity: DashboardGranularity;
};

type CreatedResolvedRow = {
  bucket: string | null;
  total: number | bigint;
};

type MttrRow = {
  bucket: string | null;
  mttrHours: number | null;
};

type WorkloadRow = {
  assignedToId: number | null;
  _count: { _all: number };
};

const dayInMs = 24 * 60 * 60 * 1000;

const toNumber = (value: number | bigint | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getDayBucketExpression = (columnName: 'createdAt' | 'resolvedAt') =>
  Prisma.sql`strftime('%Y-%m-%d', ${Prisma.raw(`"Ticket"."${columnName}"`)} / 1000, 'unixepoch')`;

const getBucketExpression = (columnName: 'createdAt' | 'resolvedAt', granularity: DashboardGranularity) => {
  const dayBucketExpression = getDayBucketExpression(columnName);
  if (granularity === 'week') {
    // SQLite has no native ISO week bucket. We group by the Monday date for the week,
    // and expose that normalized day string as the API `date` field.
    return Prisma.sql`date(${dayBucketExpression}, '-' || ((cast(strftime('%w', ${dayBucketExpression}) as integer) + 6) % 7) || ' days')`;
  }
  return dayBucketExpression;
};

const sortBuckets = (a: string | null | undefined, b: string | null | undefined) => (a ?? '').localeCompare(b ?? '');

const normalizeBucket = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const bucket = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bucket)) {
    return null;
  }
  return bucket;
};

const toUtcMidnight = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

const startOfUtcWeek = (value: Date) => {
  const day = value.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(value.getTime() + diff * dayInMs);
};

export const buildTimeGrid = (start: Date, end: Date, granularity: DashboardGranularity) => {
  const grid: string[] = [];

  if (granularity === 'day') {
    let cursor = toUtcMidnight(start);
    const limit = toUtcMidnight(end);
    while (cursor.getTime() <= limit.getTime()) {
      grid.push(cursor.toISOString().slice(0, 10));
      cursor = new Date(cursor.getTime() + dayInMs);
    }
    return grid;
  }

  let cursor = startOfUtcWeek(toUtcMidnight(start));
  const limit = toUtcMidnight(end);
  while (cursor.getTime() <= limit.getTime()) {
    grid.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 7 * dayInMs);
  }
  return grid;
};

const toSafeHours = (value: number | null | undefined) => {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }
  return Number(numericValue.toFixed(2));
};

export async function getDashboardSummary(filters: DashboardFilters) {
  const { start, end, granularity } = filters;
  const startMs = start.getTime();
  const endMs = end.getTime();

  // NOTE: SQLite + Prisma groupBy does not support truncating DateTime to day/week.
  // We use raw SQL with date()/strftime() to aggregate calendar buckets directly in SQLite.
  const createdBucketExpression = getBucketExpression('createdAt', granularity);
  const resolvedBucketExpression = getBucketExpression('resolvedAt', granularity);

  const createdRows = await prisma.$queryRaw<CreatedResolvedRow[]>(Prisma.sql`
    SELECT ${createdBucketExpression} AS bucket, COUNT(*) AS total
    FROM "Ticket"
    WHERE "createdAt" >= ${startMs} AND "createdAt" <= ${endMs}
    GROUP BY bucket
    ORDER BY bucket ASC
  `);

  const resolvedRows = await prisma.$queryRaw<CreatedResolvedRow[]>(Prisma.sql`
    SELECT ${resolvedBucketExpression} AS bucket, COUNT(*) AS total
    FROM "Ticket"
    WHERE "resolvedAt" IS NOT NULL AND "resolvedAt" >= ${startMs} AND "resolvedAt" <= ${endMs}
    GROUP BY bucket
    ORDER BY bucket ASC
  `);

  const timeGrid = buildTimeGrid(start, end, granularity);
  const createdVsResolvedMap = new Map<string, { date: string; createdCount: number; resolvedCount: number }>(
    timeGrid.map((bucket) => [bucket, { date: bucket, createdCount: 0, resolvedCount: 0 }])
  );

  for (const row of createdRows) {
    const bucket = normalizeBucket(row.bucket);
    if (!bucket) {
      continue;
    }
    const existing = createdVsResolvedMap.get(bucket) ?? { date: bucket, createdCount: 0, resolvedCount: 0 };
    existing.createdCount = toNumber(row.total);
    createdVsResolvedMap.set(bucket, existing);
  }

  for (const row of resolvedRows) {
    const bucket = normalizeBucket(row.bucket);
    if (!bucket) {
      continue;
    }
    const existing = createdVsResolvedMap.get(bucket) ?? { date: bucket, createdCount: 0, resolvedCount: 0 };
    existing.resolvedCount = toNumber(row.total);
    createdVsResolvedMap.set(bucket, existing);
  }

  const createdVsResolvedSeries = Array.from(createdVsResolvedMap.values()).sort((a, b) => sortBuckets(a.date, b.date));

  const openTicketsByStatus = await prisma.ticket.groupBy({
    by: ['statusId'],
    where: {
      resolvedAt: null,
      isActive: true
    },
    _count: {
      _all: true
    }
  });

  const statusIds = openTicketsByStatus.map((item) => item.statusId);
  const statuses = statusIds.length
    ? await prisma.status.findMany({
        where: { id: { in: statusIds } },
        select: { id: true, name: true, color: true }
      })
    : [];

  const statusMap = new Map(statuses.map((status) => [status.id, status]));

  const statusDistribution = openTicketsByStatus
    .map((item) => {
      const status = statusMap.get(item.statusId);
      if (!status) {
        return null;
      }
      return {
        statusId: item.statusId,
        statusName: status.name,
        color: status.color,
        count: item._count._all
      };
    })
    .filter((item): item is { statusId: number; statusName: string; color: string; count: number } => Boolean(item));

  const openTickets = await prisma.ticket.findMany({
    where: {
      resolvedAt: null,
      isActive: true
    },
    select: {
      createdAt: true
    }
  });

  const now = new Date();
  const backlogAgingCounters = {
    '0-2': 0,
    '3-7': 0,
    '8-14': 0,
    '15+': 0
  };

  for (const ticket of openTickets) {
    const diffMs = now.getTime() - ticket.createdAt.getTime();
    const daysOpen = Math.floor(diffMs / dayInMs);
    if (daysOpen <= 2) {
      backlogAgingCounters['0-2'] += 1;
    } else if (daysOpen <= 7) {
      backlogAgingCounters['3-7'] += 1;
    } else if (daysOpen <= 14) {
      backlogAgingCounters['8-14'] += 1;
    } else {
      backlogAgingCounters['15+'] += 1;
    }
  }

  const backlogAging = [
    { bucket: '0-2', count: backlogAgingCounters['0-2'] },
    { bucket: '3-7', count: backlogAgingCounters['3-7'] },
    { bucket: '8-14', count: backlogAgingCounters['8-14'] },
    { bucket: '15+', count: backlogAgingCounters['15+'] }
  ];

  const openAssigned = await prisma.ticket.groupBy({
    by: ['assignedToId'],
    where: {
      assignedToId: { not: null },
      resolvedAt: null,
      isActive: true
    },
    _count: {
      _all: true
    }
  });

  const resolvedInRange = await prisma.ticket.groupBy({
    by: ['assignedToId'],
    where: {
      assignedToId: { not: null },
      resolvedAt: { gte: start, lte: end },
      isActive: true
    },
    _count: {
      _all: true
    }
  });

  const workloadMap = new Map<number, { openAssignedCount: number; resolvedInRangeCount: number }>();

  const mergeWorkloadRows = (rows: WorkloadRow[], key: 'openAssignedCount' | 'resolvedInRangeCount') => {
    for (const row of rows) {
      if (row.assignedToId === null) {
        continue;
      }
      const existing = workloadMap.get(row.assignedToId) ?? { openAssignedCount: 0, resolvedInRangeCount: 0 };
      existing[key] = row._count._all;
      workloadMap.set(row.assignedToId, existing);
    }
  };

  mergeWorkloadRows(openAssigned, 'openAssignedCount');
  mergeWorkloadRows(resolvedInRange, 'resolvedInRangeCount');

  const workloadUserIds = Array.from(workloadMap.keys());
  const users = workloadUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: workloadUserIds } },
        select: { id: true, firstName: true, lastName: true }
      })
    : [];

  const usersMap = new Map(users.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim()]));

  const workloadByTech = workloadUserIds
    .map((userId) => ({
      userId,
      fullName: usersMap.get(userId) ?? `User #${userId}`,
      openAssignedCount: workloadMap.get(userId)?.openAssignedCount ?? 0,
      resolvedInRangeCount: workloadMap.get(userId)?.resolvedInRangeCount ?? 0
    }))
    .sort((a, b) => b.openAssignedCount - a.openAssignedCount || b.resolvedInRangeCount - a.resolvedInRangeCount)
    .slice(0, 10);

  const resolvedTickets = await prisma.ticket.findMany({
    where: {
      resolvedAt: {
        gte: start,
        lte: end
      },
      isActive: true
    },
    select: {
      createdAt: true,
      resolvedAt: true
    }
  });

  const mttrDurationsHours = resolvedTickets
    .map((ticket) => {
      if (!ticket.resolvedAt) {
        return 0;
      }
      return (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
    })
    .filter((hours) => Number.isFinite(hours) && hours >= 0);

  const mttrHours = mttrDurationsHours.length
    ? toSafeHours(mttrDurationsHours.reduce((acc, hours) => acc + hours, 0) / mttrDurationsHours.length)
    : 0;

  // NOTE: Same SQLite limitation as above. We need $queryRaw for bucketed averages by day/week.
  const mttrRows = await prisma.$queryRaw<MttrRow[]>(Prisma.sql`
    SELECT ${resolvedBucketExpression} AS bucket,
           AVG(("resolvedAt" - "createdAt") / 3600000.0) AS mttrHours
    FROM "Ticket"
    WHERE "resolvedAt" IS NOT NULL AND "resolvedAt" >= ${startMs} AND "resolvedAt" <= ${endMs}
    GROUP BY bucket
    ORDER BY bucket ASC
  `);

  const mttrMap = new Map<string, number>(timeGrid.map((bucket) => [bucket, 0]));
  for (const row of mttrRows) {
    const bucket = normalizeBucket(row.bucket);
    if (!bucket) {
      continue;
    }
    mttrMap.set(bucket, toSafeHours(row.mttrHours));
  }

  const mttrSeries = Array.from(mttrMap.entries())
    .sort((a, b) => sortBuckets(a[0], b[0]))
    .map(([date, value]) => ({ date, mttrHours: value }));

  const totalCreated = createdRows.reduce((acc, row) => acc + toNumber(row.total), 0);
  const totalResolved = resolvedRows.reduce((acc, row) => acc + toNumber(row.total), 0);
  const openBacklog = openTickets.length;

  return {
    kpis: {
      totalCreated,
      totalResolved,
      openBacklog,
      mttrHours
    },
    createdVsResolvedSeries,
    statusDistribution: statusDistribution ?? [],
    backlogAging: backlogAging ?? [],
    workloadByTech: workloadByTech ?? [],
    mttrSeries
  };
}
