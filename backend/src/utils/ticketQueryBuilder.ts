import { Prisma } from '@prisma/client';

export type FilterOperator =
  | 'Equals'
  | 'Does not equal'
  | 'Contains'
  | 'Does not contain'
  | 'Begin with'
  | 'Does not begin with'
  | 'End with'
  | 'Does not end with'
  | 'Contains data'
  | 'Does not contain data';

export type DateFilterOperator = 'On' | 'On or after' | 'On or before';
export type DateFilterPreset = 'Today' | 'Yesterday' | 'This week' | 'This month' | 'This year';

export type DateColumnFilter = { kind: 'date'; op: DateFilterOperator; preset: DateFilterPreset; date?: string };
export type TextColumnFilter = { kind: 'text'; op: FilterOperator; value?: string };
export type ColumnFilterInput = TextColumnFilter | DateColumnFilter;

export type TicketQueryInput = {
  q?: string;
  filters?: Record<string, ColumnFilterInput | undefined>;
  sort?: { column?: string; direction?: 'asc' | 'desc' } | null;
};

const filterOperators: FilterOperator[] = [
  'Equals',
  'Does not equal',
  'Contains',
  'Does not contain',
  'Begin with',
  'Does not begin with',
  'End with',
  'Does not end with',
  'Contains data',
  'Does not contain data'
];

const dateFilterOperators: DateFilterOperator[] = ['On', 'On or after', 'On or before'];
const dateFilterPresets: DateFilterPreset[] = ['Today', 'Yesterday', 'This week', 'This month', 'This year'];

const operatorsNeedingValue = new Set<FilterOperator>([
  'Equals',
  'Does not equal',
  'Contains',
  'Does not contain',
  'Begin with',
  'Does not begin with',
  'End with',
  'Does not end with'
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseTicketQuery(value: unknown): TicketQueryInput {
  if (!isPlainObject(value)) {
    throw new Error('ticketQuery is required.');
  }
  const q = typeof value.q === 'string' ? value.q : undefined;
  let sort: TicketQueryInput['sort'] = null;
  if (value.sort !== undefined) {
    if (!isPlainObject(value.sort)) {
      throw new Error('Invalid sort.');
    }
    const column = value.sort.column;
    const direction = value.sort.direction;
    if (typeof column !== 'string' || (direction !== 'asc' && direction !== 'desc')) {
      throw new Error('Invalid sort.');
    }
    sort = { column, direction };
  }
  const filters: Record<string, ColumnFilterInput | undefined> = {};
  if (value.filters !== undefined) {
    if (!isPlainObject(value.filters)) {
      throw new Error('Invalid filters.');
    }
    Object.entries(value.filters).forEach(([key, filterValue]) => {
      if (!filterValue) {
        return;
      }
      if (!isPlainObject(filterValue)) {
        throw new Error(`Invalid filter for ${key}.`);
      }
      const kind = filterValue.kind;
      if (kind === 'text') {
        const op = filterValue.op;
        const filter = filterValue as TextColumnFilter;
        if (!filterOperators.includes(op as FilterOperator)) {
          throw new Error(`Invalid filter operator for ${key}.`);
        }
        if (operatorsNeedingValue.has(op as FilterOperator) && typeof filter.value !== 'string') {
          throw new Error(`Missing filter value for ${key}.`);
        }
        filters[key] = { kind: 'text', op: op as FilterOperator, value: filter.value };
      } else if (kind === 'date') {
        const op = filterValue.op;
        const preset = filterValue.preset;
        if (!dateFilterOperators.includes(op as DateFilterOperator) || !dateFilterPresets.includes(preset as DateFilterPreset)) {
          throw new Error(`Invalid date filter for ${key}.`);
        }
        filters[key] = { kind: 'date', op: op as DateFilterOperator, preset: preset as DateFilterPreset };
      } else {
        throw new Error(`Invalid filter for ${key}.`);
      }
    });
  }
  return { q, sort, filters: Object.keys(filters).length > 0 ? filters : undefined };
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function endOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

function getPresetRange(preset: DateFilterPreset) {
  const now = new Date();
  switch (preset) {
    case 'Today': {
      const start = startOfDay(now);
      const end = endOfDay(now);
      return { start, end, endOfRange: end };
    }
    case 'Yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const start = startOfDay(yesterday);
      const end = endOfDay(yesterday);
      return { start, end, endOfRange: end };
    }
    case 'This week': {
      const day = now.getDay();
      const diff = (day + 6) % 7;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - diff);
      const start = startOfDay(weekStart);
      const weekEnd = new Date(start);
      weekEnd.setDate(start.getDate() + 6);
      const endOfRange = endOfDay(weekEnd);
      return { start, end: now, endOfRange };
    }
    case 'This month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const endOfRange = endOfDay(monthEnd);
      return { start, end: now, endOfRange };
    }
    case 'This year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      const endOfRange = endOfDay(yearEnd);
      return { start, end: now, endOfRange };
    }
    default: {
      const start = startOfDay(now);
      const end = endOfDay(now);
      return { start, end, endOfRange: end };
    }
  }
}

function buildTextFilter(filter: TextColumnFilter): Prisma.StringFilter {
  const value = (filter.value ?? '').toString();
  switch (filter.op) {
    case 'Equals':
      return { equals: value };
    case 'Does not equal':
      return { not: value };
    case 'Contains':
      return { contains: value };
    case 'Does not contain':
      return { not: { contains: value } };
    case 'Begin with':
      return { startsWith: value };
    case 'Does not begin with':
      return { not: { startsWith: value } };
    case 'End with':
      return { endsWith: value };
    case 'Does not end with':
      return { not: { endsWith: value } };
    case 'Contains data':
      return { not: '' };
    case 'Does not contain data':
      return { equals: '' };
    default:
      return {};
  }
}

function buildNameFilter(filter: TextColumnFilter): Prisma.UserWhereInput {
  const value = (filter.value ?? '').toString();
  switch (filter.op) {
    case 'Equals':
      return {
        OR: [{ firstName: { equals: value } }, { lastName: { equals: value } }]
      };
    case 'Does not equal':
      return {
        NOT: { OR: [{ firstName: { equals: value } }, { lastName: { equals: value } }] }
      };
    case 'Contains':
      return {
        OR: [{ firstName: { contains: value } }, { lastName: { contains: value } }]
      };
    case 'Does not contain':
      return {
        NOT: { OR: [{ firstName: { contains: value } }, { lastName: { contains: value } }] }
      };
    case 'Begin with':
      return {
        OR: [{ firstName: { startsWith: value } }, { lastName: { startsWith: value } }]
      };
    case 'Does not begin with':
      return {
        NOT: { OR: [{ firstName: { startsWith: value } }, { lastName: { startsWith: value } }] }
      };
    case 'End with':
      return {
        OR: [{ firstName: { endsWith: value } }, { lastName: { endsWith: value } }]
      };
    case 'Does not end with':
      return {
        NOT: { OR: [{ firstName: { endsWith: value } }, { lastName: { endsWith: value } }] }
      };
    case 'Contains data':
      return { OR: [{ firstName: { not: '' } }, { lastName: { not: '' } }] };
    case 'Does not contain data':
      return { AND: [{ firstName: { equals: '' } }, { lastName: { equals: '' } }] };
    default:
      return {};
  }
}

function buildDateFilter(filter: DateColumnFilter): Prisma.DateTimeFilter {
  const { start, end, endOfRange } = getPresetRange(filter.preset);
  switch (filter.op) {
    case 'On':
      return { gte: start, lte: end };
    case 'On or after':
      return { gte: start };
    case 'On or before':
      return { lte: endOfRange };
    default:
      return {};
  }
}

function buildGlobalSearch(text: string): Prisma.TicketWhereInput {
  const value = text.trim();
  return {
    OR: [
      { title: { contains: value } },
      { description: { contains: value } },
      { code: { contains: value } },
      { status: { name: { contains: value } } },
      { priority: { name: { contains: value } } },
      { ticketType: { name: { contains: value } } },
      { ticketType: { description: { contains: value } } },
      { createdBy: { OR: [{ firstName: { contains: value } }, { lastName: { contains: value } }] } },
      { assignedTo: { is: { OR: [{ firstName: { contains: value } }, { lastName: { contains: value } }] } } }
    ]
  };
}

function buildFilters(filters: Record<string, ColumnFilterInput | undefined>): Prisma.TicketWhereInput[] {
  const conditions: Prisma.TicketWhereInput[] = [];
  Object.entries(filters).forEach(([columnId, filter]) => {
    if (!filter) return;
    if (filter.kind === 'date') {
      const dateFilter = buildDateFilter(filter);
      if (columnId === 'createdAt') {
        conditions.push({ createdAt: dateFilter });
      }
      if (columnId === 'updatedAt') {
        conditions.push({ updatedAt: dateFilter });
      }
      return;
    }
    if (filter.kind === 'text') {
      if (columnId === 'title') {
        conditions.push({ title: buildTextFilter(filter) });
      }
      if (columnId === 'status') {
        conditions.push({ status: { name: buildTextFilter(filter) } });
      }
      if (columnId === 'priority') {
        conditions.push({ priority: { name: buildTextFilter(filter) } });
      }
      if (columnId === 'type') {
        conditions.push({ ticketType: { name: buildTextFilter(filter) } });
      }
      if (columnId === 'createdBy') {
        if (filter.op === 'Contains data') {
          conditions.push({});
        } else if (filter.op === 'Does not contain data') {
          conditions.push({ createdBy: { id: { equals: -1 } } });
        } else {
          conditions.push({ createdBy: buildNameFilter(filter) });
        }
      }
      if (columnId === 'assignedTo') {
        if (filter.op === 'Contains data') {
          conditions.push({ assignedTo: { isNot: null } });
        } else if (filter.op === 'Does not contain data') {
          conditions.push({ assignedTo: null });
        } else {
          conditions.push({ assignedTo: { is: buildNameFilter(filter) } });
        }
      }
    }
  });
  return conditions;
}

function buildOrderBy(sort?: TicketQueryInput['sort']): Prisma.TicketOrderByWithRelationInput | Prisma.TicketOrderByWithRelationInput[] {
  const direction = sort?.direction === 'asc' ? 'asc' : 'desc';
  switch (sort?.column) {
    case 'updatedAt':
      return { updatedAt: direction };
    case 'priority':
      return { priority: { name: direction } };
    case 'status':
      return { status: { sortOrder: direction } };
    case 'title':
      return { title: direction };
    case 'type':
      return { ticketType: { name: direction } };
    case 'createdBy':
      return [{ createdBy: { firstName: direction } }, { createdBy: { lastName: direction } }];
    case 'assignedTo':
      return [{ assignedTo: { firstName: direction } }, { assignedTo: { lastName: direction } }];
    case 'createdAt':
      return { createdAt: direction };
    default:
      return { createdAt: 'desc' };
  }
}

export function buildTicketQuery({
  query,
  baseWhere
}: {
  query: TicketQueryInput;
  baseWhere?: Prisma.TicketWhereInput;
}): {
  where: Prisma.TicketWhereInput;
  orderBy: Prisma.TicketOrderByWithRelationInput | Prisma.TicketOrderByWithRelationInput[];
} {
  const clauses: Prisma.TicketWhereInput[] = [];
  if (baseWhere && Object.keys(baseWhere).length > 0) {
    clauses.push(baseWhere);
  }
  if (query.q && query.q.trim()) {
    clauses.push(buildGlobalSearch(query.q));
  }
  if (query.filters) {
    clauses.push(...buildFilters(query.filters));
  }
  const where = clauses.length > 0 ? { AND: clauses } : {};
  const orderBy = buildOrderBy(query.sort);
  return { where, orderBy };
}
