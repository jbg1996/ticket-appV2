import { Prisma } from '@prisma/client';
import prisma from '../prisma/client.js';

export type DashboardGranularity = 'day' | 'week';

export type DashboardFilters = {
  start: Date;
  end: Date;
  granularity: DashboardGranularity;
};

type CreatedResolvedRow = {
  bucket: string;
  total: number | bigint;
};

type MttrRow = {
  bucket: string;
  mttrHours: number | null;
};

type WorkloadRow = {
  assignedToId: number | null;
  _count: { _all: number };
};

const toNumber = (value: number | bigint | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }
  return Number(value);
};

const getBucketExpression = (columnName: 'createdAt' | 'resolvedAt', granularity: DashboardGranularity) => {
  if (granularity === 'week') {
    return Prisma.sql`strftime('%Y-W%W', ${Prisma.raw(`"Ticket"."${columnName}"`)})`;
  }
  return Prisma.sql`date(${Prisma.raw(`"Ticket"."${columnName}"`)})`;
};

const sortBuckets = (a: string, b: string) => a.localeCompare(b);

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

  const createdVsResolvedMap = new Map<string, { date: string; createdCount: number; resolvedCount: number }>();

  for (const row of createdRows) {
    createdVsResolvedMap.set(row.bucket, {
      date: row.bucket,
      createdCount: toNumber(row.total),
      resolvedCount: 0
    });
  }

  for (const row of resolvedRows) {
    const existing = createdVsResolvedMap.get(row.bucket);
    if (existing) {
      existing.resolvedCount = toNumber(row.total);
      continue;
    }
    createdVsResolvedMap.set(row.bucket, {
      date: row.bucket,
      createdCount: 0,
      resolvedCount: toNumber(row.total)
    });
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
    const daysOpen = Math.floor(diffMs / (24 * 60 * 60 * 1000));
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
      if (!row.assignedToId) {
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
    .sort((a, b) => b.openAssignedCount - a.openAssignedCount || b.resolvedInRangeCount - a.resolvedInRangeCount);

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
    .filter((hours) => hours >= 0);

  const mttrHours = mttrDurationsHours.length
    ? Number((mttrDurationsHours.reduce((acc, hours) => acc + hours, 0) / mttrDurationsHours.length).toFixed(2))
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

  const mttrSeries = mttrRows.map((row) => ({
    date: row.bucket,
    mttrHours: Number((row.mttrHours ?? 0).toFixed(2))
  }));

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
    statusDistribution,
    backlogAging,
    workloadByTech,
    mttrSeries
  };
}
