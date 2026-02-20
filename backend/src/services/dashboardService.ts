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

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toNumber = (value: number | bigint | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getBucketExpression = (columnName: 'createdAt' | 'resolvedAt', granularity: DashboardGranularity) => {
  if (granularity === 'week') {
    return Prisma.sql`strftime('%Y-W%W', ${Prisma.raw(`"Ticket"."${columnName}"`)})`;
  }
  return Prisma.sql`date(${Prisma.raw(`"Ticket"."${columnName}"`)})`;
};

const sortBuckets = (a: string | null | undefined, b: string | null | undefined) => (a ?? '').localeCompare(b ?? '');

const normalizeBucket = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const bucket = value.trim();
  return bucket.length > 0 ? bucket : null;
};

const toUtcMidnight = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

const startOfUtcWeek = (value: Date) => {
  const day = value.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(value.getTime() + diff * DAY_IN_MS);
};

const formatWeekBucket = (value: Date) => {
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((value.getTime() - yearStart.getTime()) / DAY_IN_MS);
  const mondayBasedWeekDay = (value.getUTCDay() + 6) % 7;
  const week = String(Math.floor((dayOfYear + 7 - mondayBasedWeekDay) / 7)).padStart(2, '0');
  return `${value.getUTCFullYear()}-W${week}`;
};

const buildTimeGrid = (start: Date, end: Date, granularity: DashboardGranularity) => {
  const grid: string[] = [];

  if (granularity === 'day') {
    let cursor = toUtcMidnight(start);
    const limit = toUtcMidnight(end);
    while (cursor.getTime() <= limit.getTime()) {
      grid.push(cursor.toISOString().slice(0, 10));
      cursor = new Date(cursor.getTime() + DAY_IN_MS);
    }
    return grid;
  }

  let cursor = startOfUtcWeek(toUtcMidnight(start));
  const limit = toUtcMidnight(end);
  while (cursor.getTime() <= limit.getTime()) {
    grid.push(formatWeekBucket(cursor));
    cursor = new Date(cursor.getTime() + 7 * DAY_IN_MS);
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

  // NOTE: SQLite + Prisma groupBy does not support truncating DateTime to day/week.
  // We use raw SQL with date()/strftime() to aggregate calendar buckets directly in SQLite.
  const createdBucketExpression = getBucketExpression('createdAt', granularity);
  const resolvedBucketExpression = getBucketExpression('resolvedAt', granularity);

  const createdRows = await prisma.$queryRaw<CreatedResolvedRow[]>(Prisma.sql`
    SELECT ${createdBucketExpression} AS bucket, COUNT(*) AS total
    FROM "Ticket"
    WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
    GROUP BY bucket
    ORDER BY bucket ASC
  `);

  const resolvedRows = await prisma.$queryRaw<CreatedResolvedRow[]>(Prisma.sql`
    SELECT ${resolvedBucketExpression} AS bucket, COUNT(*) AS total
    FROM "Ticket"
    WHERE "resolvedAt" IS NOT NULL AND "resolvedAt" >= ${start} AND "resolvedAt" <= ${end}
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
    const daysOpen = Math.floor(diffMs / DAY_IN_MS);
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
           AVG((julianday("resolvedAt") - julianday("createdAt")) * 24.0) AS mttrHours
    FROM "Ticket"
    WHERE "resolvedAt" IS NOT NULL AND "resolvedAt" >= ${start} AND "resolvedAt" <= ${end}
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
