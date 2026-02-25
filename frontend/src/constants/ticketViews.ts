import type { User } from '../components/AuthProvider';

export const TICKET_VIEW_KEY = {
  ALL_TICKETS: 'ALL_TICKETS',
  CREATED_BY_ME: 'CREATED_BY_ME',
  ASSIGNED_TO_ME: 'ASSIGNED_TO_ME',
  RESOLVED_RELATED_ACTIVE: 'RESOLVED_RELATED_ACTIVE',
  UNASSIGNED_OPEN: 'UNASSIGNED_OPEN',
  RESOLVED_CREATED_BY_ME: 'RESOLVED_CREATED_BY_ME'
} as const;

export type TicketViewKey = (typeof TICKET_VIEW_KEY)[keyof typeof TICKET_VIEW_KEY];
export type UserRole = User['role'];

export type TicketViewDefinition = {
  key: TicketViewKey;
  label: string;
  description: string;
  rolesAllowed: UserRole[];
};

export const TICKET_VIEWS: TicketViewDefinition[] = [
  {
    key: TICKET_VIEW_KEY.ALL_TICKETS,
    label: 'All Tickets',
    description: 'Shows all tickets regardless of status.',
    rolesAllowed: ['ADMIN']
  },
  {
    key: TICKET_VIEW_KEY.CREATED_BY_ME,
    label: 'Tickets Created by Me',
    description: 'Shows tickets created by the current user.',
    rolesAllowed: ['ADMIN', 'TECH', 'REQUESTER']
  },
  {
    key: TICKET_VIEW_KEY.ASSIGNED_TO_ME,
    label: 'Tickets Assigned to Me',
    description: 'Shows tickets assigned to the current user.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  {
    key: TICKET_VIEW_KEY.RESOLVED_RELATED_ACTIVE,
    label: 'Resolved Tickets (Active & Related to Me)',
    description: 'Shows active resolved tickets created by or assigned to the current user.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  {
    key: TICKET_VIEW_KEY.UNASSIGNED_OPEN,
    label: 'Unassigned Open Tickets',
    description: 'Shows non-resolved tickets that are unassigned.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  {
    key: TICKET_VIEW_KEY.RESOLVED_CREATED_BY_ME,
    label: 'Resolved Tickets Created by Me',
    description: 'Shows resolved tickets created by the current user.',
    rolesAllowed: ['REQUESTER']
  }
];

export const getAllowedTicketViews = (role: UserRole | undefined) => {
  if (!role) return [];
  return TICKET_VIEWS.filter((view) => view.rolesAllowed.includes(role));
};

export const DEFAULT_TICKET_VIEW_BY_ROLE: Record<UserRole, TicketViewKey> = {
  ADMIN: TICKET_VIEW_KEY.ALL_TICKETS,
  TECH: TICKET_VIEW_KEY.ASSIGNED_TO_ME,
  REQUESTER: TICKET_VIEW_KEY.CREATED_BY_ME
};
