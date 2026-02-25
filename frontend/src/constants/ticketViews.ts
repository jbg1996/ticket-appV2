import type { User } from '../components/AuthProvider';

export const ticketViewKey = {
  allTickets: 'ALL_TICKETS',
  createdByMe: 'CREATED_BY_ME',
  assignedToMe: 'ASSIGNED_TO_ME',
  resolvedRelatedActive: 'RESOLVED_RELATED_ACTIVE',
  unassignedOpen: 'UNASSIGNED_OPEN',
  resolvedCreatedByMe: 'RESOLVED_CREATED_BY_ME'
} as const;

export type ticketViewKeyName = (typeof ticketViewKey)[keyof typeof ticketViewKey];
export type userRole = User['role'];

export type ticketViewDefinition = {
  key: ticketViewKeyName;
  label: string;
  description: string;
  rolesAllowed: userRole[];
};

export const ticketViews: ticketViewDefinition[] = [
  {
    key: ticketViewKey.allTickets,
    label: 'All Tickets',
    description: 'Shows all tickets regardless of status.',
    rolesAllowed: ['ADMIN']
  },
  {
    key: ticketViewKey.createdByMe,
    label: 'Tickets Created by Me',
    description: 'Shows tickets created by the current user.',
    rolesAllowed: ['ADMIN', 'TECH', 'REQUESTER']
  },
  {
    key: ticketViewKey.assignedToMe,
    label: 'Tickets Assigned to Me',
    description: 'Shows tickets assigned to the current user.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  {
    key: ticketViewKey.resolvedRelatedActive,
    label: 'Resolved Tickets (Active & Related to Me)',
    description: 'Shows active resolved tickets created by or assigned to the current user.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  {
    key: ticketViewKey.unassignedOpen,
    label: 'Unassigned Open Tickets',
    description: 'Shows non-resolved tickets that are unassigned.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  {
    key: ticketViewKey.resolvedCreatedByMe,
    label: 'Resolved Tickets Created by Me',
    description: 'Shows resolved tickets created by the current user.',
    rolesAllowed: ['REQUESTER']
  }
];

export const getAllowedTicketViews = (role: userRole | undefined) => {
  if (!role) return [];
  return ticketViews.filter((view) => view.rolesAllowed.includes(role));
};

export const defaultTicketViewByRole: Record<userRole, ticketViewKeyName> = {
  ADMIN: ticketViewKey.allTickets,
  TECH: ticketViewKey.assignedToMe,
  REQUESTER: ticketViewKey.createdByMe
};
