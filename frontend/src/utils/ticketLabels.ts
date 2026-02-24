const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

const TYPE_LABELS: Record<string, string> = {
  REQUEST: 'Request',
  INCIDENT: 'Incident',
  ACCESS: 'Access',
  HARDWARE: 'Hardware',
  SOFTWARE: 'Software',
  OTHER: 'Other'
};

const fromMap = (labels: Record<string, string>, value: string) => labels[value] ?? value;

export const ticketStatusLabel = (value: string) => fromMap(STATUS_LABELS, value);
export const ticketPriorityLabel = (value: string) => fromMap(PRIORITY_LABELS, value);
export const ticketTypeLabel = (value: string) => fromMap(TYPE_LABELS, value);
