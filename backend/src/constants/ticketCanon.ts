const canonicalTicketStatus = {
  new: 'new',
  inProgress: 'inProgress',
  onHold: 'onHold',
  resolved: 'resolved',
  closed: 'closed'
} as const;

const canonicalTicketPriority = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical'
} as const;

const canonicalTicketType = {
  request: 'request',
  incident: 'incident',
  access: 'access',
  hardware: 'hardware',
  software: 'software',
  other: 'other'
} as const;

export { canonicalTicketStatus, canonicalTicketPriority, canonicalTicketType };

export type TicketStatusCode = (typeof canonicalTicketStatus)[keyof typeof canonicalTicketStatus];

export const statusTransitions: Record<TicketStatusCode, TicketStatusCode[]> = {
  [canonicalTicketStatus.new]: [canonicalTicketStatus.inProgress, canonicalTicketStatus.onHold],
  [canonicalTicketStatus.inProgress]: [canonicalTicketStatus.onHold, canonicalTicketStatus.resolved],
  [canonicalTicketStatus.onHold]: [canonicalTicketStatus.inProgress, canonicalTicketStatus.resolved],
  [canonicalTicketStatus.resolved]: [canonicalTicketStatus.closed],
  [canonicalTicketStatus.closed]: []
};

const normalizeDelimitedCode = (value: string) =>
  value
    .trim()
    .replace(/[\s-]+/g, '_')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.toLowerCase())
    .map((segment, index) => (index === 0 ? segment : `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`))
    .join('');

const canonicalStatusByLower: Record<string, TicketStatusCode> = Object.values(canonicalTicketStatus).reduce(
  (accumulator, code) => ({ ...accumulator, [code.toLowerCase()]: code }),
  {} as Record<string, TicketStatusCode>
);

const canonicalPriorityByLower: Record<string, string> = Object.values(canonicalTicketPriority).reduce(
  (accumulator, code) => ({ ...accumulator, [code.toLowerCase()]: code }),
  {} as Record<string, string>
);

const canonicalTypeByLower: Record<string, string> = Object.values(canonicalTicketType).reduce(
  (accumulator, code) => ({ ...accumulator, [code.toLowerCase()]: code }),
  {} as Record<string, string>
);

export const normalizeStatusName = (value: string) => {
  const normalized = normalizeDelimitedCode(value);
  return canonicalStatusByLower[normalized.toLowerCase()] ?? normalized;
};

export const normalizePriorityName = (value: string) => {
  const normalized = normalizeDelimitedCode(value);
  return canonicalPriorityByLower[normalized.toLowerCase()] ?? normalized;
};

export const normalizeTypeName = (value: string) => {
  const normalized = normalizeDelimitedCode(value);
  return canonicalTypeByLower[normalized.toLowerCase()] ?? normalized;
};
