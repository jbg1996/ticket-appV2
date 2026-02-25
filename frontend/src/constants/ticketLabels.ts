import { formatLabel } from '../utils/formatLabel';

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

const formatWithFallback = (labels: Record<string, string>, value: string) => labels[value] ?? formatLabel(value);

export const ticketStatusLabel = (value: string) => formatWithFallback(statusLabel, value);
export const ticketPriorityLabel = (value: string) => formatWithFallback(priorityLabel, value);
export const ticketTypeLabel = (value: string) => formatWithFallback(typeLabel, value);
