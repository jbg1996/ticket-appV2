import { titleCase } from '../utils/titleCase';

export const statusLabel: Record<string, string> = {
  new: 'New',
  inProgress: 'In Progress',
  onHold: 'On Hold',
  resolved: 'Resolved',
  closed: 'Closed'
};

export const priorityLabel: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical'
};

export const typeLabel: Record<string, string> = {
  request: 'Request',
  incident: 'Incident',
  access: 'Access',
  hardware: 'Hardware',
  software: 'Software',
  other: 'Other'
};

const statusAppByDb: Record<string, string> = {
  NEW: 'new',
  IN_PROGRESS: 'inProgress',
  ON_HOLD: 'onHold',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

const priorityAppByDb: Record<string, string> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const typeAppByDb: Record<string, string> = {
  REQUEST: 'request',
  INCIDENT: 'incident',
  ACCESS: 'access',
  HARDWARE: 'hardware',
  SOFTWARE: 'software',
  OTHER: 'other'
};

const formatWithFallback = (labels: Record<string, string>, value: string) => labels[value] ?? titleCase(value);

export const toAppStatusName = (value: string) => statusAppByDb[value] ?? value;
export const toAppPriorityName = (value: string) => priorityAppByDb[value] ?? value;
export const toAppTypeName = (value: string) => typeAppByDb[value] ?? value;

export const ticketStatusLabel = (value: string) => formatWithFallback(statusLabel, toAppStatusName(value));
export const ticketPriorityLabel = (value: string) => formatWithFallback(priorityLabel, toAppPriorityName(value));
export const ticketTypeLabel = (value: string) => formatWithFallback(typeLabel, toAppTypeName(value));
