export const ticketStatus = {
  new: 'new',
  inProgress: 'inProgress',
  onHold: 'onHold',
  resolved: 'resolved',
  closed: 'closed'
} as const;

export const ticketPriority = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical'
} as const;

export const ticketType = {
  request: 'request',
  incident: 'incident',
  access: 'access',
  hardware: 'hardware',
  software: 'software',
  other: 'other'
} as const;

const statusDbByApp: Record<string, string> = {
  [ticketStatus.new]: 'NEW',
  [ticketStatus.inProgress]: 'IN_PROGRESS',
  [ticketStatus.onHold]: 'ON_HOLD',
  [ticketStatus.resolved]: 'RESOLVED',
  [ticketStatus.closed]: 'CLOSED'
};

const priorityDbByApp: Record<string, string> = {
  [ticketPriority.low]: 'LOW',
  [ticketPriority.medium]: 'MEDIUM',
  [ticketPriority.high]: 'HIGH',
  [ticketPriority.critical]: 'CRITICAL'
};

const typeDbByApp: Record<string, string> = {
  [ticketType.request]: 'REQUEST',
  [ticketType.incident]: 'INCIDENT',
  [ticketType.access]: 'ACCESS',
  [ticketType.hardware]: 'HARDWARE',
  [ticketType.software]: 'SOFTWARE',
  [ticketType.other]: 'OTHER'
};

const reverseRecord = (map: Record<string, string>) =>
  Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key]));

const statusAppByDb = reverseRecord(statusDbByApp);
const priorityAppByDb = reverseRecord(priorityDbByApp);
const typeAppByDb = reverseRecord(typeDbByApp);

export type ticketStatusName = (typeof ticketStatus)[keyof typeof ticketStatus];

export const legacyStatusToApp: Record<string, ticketStatusName> = {
  Nuevo: ticketStatus.new,
  NUEVO: ticketStatus.new,
  'En progreso': ticketStatus.inProgress,
  EN_PROGRESO: ticketStatus.inProgress,
  'En espera': ticketStatus.onHold,
  EN_ESPERA: ticketStatus.onHold,
  Resuelto: ticketStatus.resolved,
  RESUELTO: ticketStatus.resolved,
  Cerrado: ticketStatus.closed,
  CERRADO: ticketStatus.closed
};

export const legacyPriorityToApp: Record<string, string> = {
  Baja: ticketPriority.low,
  BAJA: ticketPriority.low,
  Media: ticketPriority.medium,
  MEDIA: ticketPriority.medium,
  Alta: ticketPriority.high,
  ALTA: ticketPriority.high,
  Crítica: ticketPriority.critical,
  CRITICA: ticketPriority.critical,
  CRÍTICA: ticketPriority.critical
};

export const legacyTypeToApp: Record<string, string> = {
  PETICIÓN: ticketType.request,
  PETICION: ticketType.request,
  INCIDENCIA: ticketType.incident,
  ACCESO: ticketType.access,
  OTROS: ticketType.other
};

export const statusTransitions: Record<ticketStatusName, ticketStatusName[]> = {
  [ticketStatus.new]: [ticketStatus.inProgress, ticketStatus.onHold],
  [ticketStatus.inProgress]: [ticketStatus.onHold, ticketStatus.resolved],
  [ticketStatus.onHold]: [ticketStatus.inProgress, ticketStatus.resolved],
  [ticketStatus.resolved]: [ticketStatus.closed],
  [ticketStatus.closed]: []
};

export const normalizeStatusName = (value: string) => legacyStatusToApp[value] ?? statusAppByDb[value] ?? value;
export const normalizePriorityName = (value: string) => legacyPriorityToApp[value] ?? priorityAppByDb[value] ?? value;
export const normalizeTypeName = (value: string) => legacyTypeToApp[value] ?? typeAppByDb[value] ?? value;

export const toDbStatusName = (value: string) => statusDbByApp[value] ?? value;
export const toDbPriorityName = (value: string) => priorityDbByApp[value] ?? value;
export const toDbTypeName = (value: string) => typeDbByApp[value] ?? value;

export const toAppStatusName = (value: string) => statusAppByDb[value] ?? normalizeStatusName(value);
export const toAppPriorityName = (value: string) => priorityAppByDb[value] ?? normalizePriorityName(value);
export const toAppTypeName = (value: string) => typeAppByDb[value] ?? normalizeTypeName(value);

export const ticketStatusLabelMap: Record<string, string> = {
  [ticketStatus.new]: 'New',
  [ticketStatus.inProgress]: 'In Progress',
  [ticketStatus.onHold]: 'On Hold',
  [ticketStatus.resolved]: 'Resolved',
  [ticketStatus.closed]: 'Closed'
};

export const ticketPriorityLabelMap: Record<string, string> = {
  [ticketPriority.low]: 'Low',
  [ticketPriority.medium]: 'Medium',
  [ticketPriority.high]: 'High',
  [ticketPriority.critical]: 'Critical'
};

export const ticketTypeLabelMap: Record<string, string> = {
  [ticketType.request]: 'Request',
  [ticketType.incident]: 'Incident',
  [ticketType.access]: 'Access',
  [ticketType.hardware]: 'Hardware',
  [ticketType.software]: 'Software',
  [ticketType.other]: 'Other'
};
