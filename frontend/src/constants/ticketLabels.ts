import { titleCase } from '../utils/titleCase';

export const statusLabel: Record<string, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
};

export const priorityLabel: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

export const typeLabel: Record<string, string> = {
  REQUEST: 'Request',
  INCIDENT: 'Incident',
  ACCESS: 'Access',
  HARDWARE: 'Hardware',
  SOFTWARE: 'Software',
  OTHER: 'Other'
};

const formatWithFallback = (labels: Record<string, string>, value: string) => labels[value] ?? titleCase(value);

export const ticketStatusLabel = (value: string) => formatWithFallback(statusLabel, value);
export const ticketPriorityLabel = (value: string) => formatWithFallback(priorityLabel, value);
export const ticketTypeLabel = (value: string) => formatWithFallback(typeLabel, value);
