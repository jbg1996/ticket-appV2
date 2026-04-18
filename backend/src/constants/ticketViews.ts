import { Prisma } from '@prisma/client';
import { TICKET_STATUS } from './ticketCanon.js';

export const TICKET_VIEW_KEY = {
  ALL_TICKETS: 'ALL_TICKETS',
  CREATED_BY_ME: 'CREATED_BY_ME',
  ASSIGNED_TO_ME: 'ASSIGNED_TO_ME',
  RESOLVED_RELATED_ACTIVE: 'RESOLVED_RELATED_ACTIVE',
  UNASSIGNED_OPEN: 'UNASSIGNED_OPEN',
  RESOLVED_CREATED_BY_ME: 'RESOLVED_CREATED_BY_ME'
} as const;

export type TicketViewKey = (typeof TICKET_VIEW_KEY)[keyof typeof TICKET_VIEW_KEY];
export type TicketViewRole = 'ADMIN' | 'TECH' | 'REQUESTER';

export type CurrentTicketUser = {
  id: number;
  role: string;
};

export const TICKET_VIEW_DEFINITIONS: Record<
  TicketViewKey,
  {
    label: string;
    description: string;
    rolesAllowed: TicketViewRole[];
  }
> = {
  [TICKET_VIEW_KEY.ALL_TICKETS]: {
    label: 'All Tickets',
    description: 'Shows all tickets regardless of status.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  [TICKET_VIEW_KEY.CREATED_BY_ME]: {
    label: 'Tickets Created by Me',
    description: 'Shows tickets created by the current user.',
    rolesAllowed: ['ADMIN', 'TECH', 'REQUESTER']
  },
  [TICKET_VIEW_KEY.ASSIGNED_TO_ME]: {
    label: 'Tickets Assigned to Me',
    description: 'Shows tickets assigned to the current user.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  [TICKET_VIEW_KEY.RESOLVED_RELATED_ACTIVE]: {
    label: 'Resolved Tickets (Active & Related to Me)',
    description: 'Shows active resolved tickets created by or assigned to the current user.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  [TICKET_VIEW_KEY.UNASSIGNED_OPEN]: {
    label: 'Unassigned Open Tickets',
    description: 'Shows non-resolved tickets that are unassigned.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  [TICKET_VIEW_KEY.RESOLVED_CREATED_BY_ME]: {
    label: 'Resolved Tickets Created by Me',
    description: 'Shows resolved tickets created by the current user.',
    rolesAllowed: ['REQUESTER']
  }
};

export const isTicketViewKey = (value: string): value is TicketViewKey =>
  Object.values(TICKET_VIEW_KEY).includes(value as TicketViewKey);

export const isViewAllowedForRole = (viewKey: TicketViewKey, role: string) =>
  TICKET_VIEW_DEFINITIONS[viewKey].rolesAllowed.includes(role as TicketViewRole);

export function buildTicketWhere(viewKey: TicketViewKey, currentUser: CurrentTicketUser): Prisma.TicketWhereInput {
  switch (viewKey) {
    case TICKET_VIEW_KEY.ALL_TICKETS:
      return {};
    case TICKET_VIEW_KEY.CREATED_BY_ME:
      return { createdById: currentUser.id };
    case TICKET_VIEW_KEY.ASSIGNED_TO_ME:
      return { assignedToId: currentUser.id };
    case TICKET_VIEW_KEY.RESOLVED_RELATED_ACTIVE:
      return {
        isActive: true,
        status: { name: TICKET_STATUS.RESOLVED },
        OR: [{ createdById: currentUser.id }, { assignedToId: currentUser.id }]
      };
    case TICKET_VIEW_KEY.UNASSIGNED_OPEN:
      return {
        assignedToId: null,
        status: { name: { not: TICKET_STATUS.RESOLVED } }
      };
    case TICKET_VIEW_KEY.RESOLVED_CREATED_BY_ME:
      return {
        createdById: currentUser.id,
        status: { name: TICKET_STATUS.RESOLVED }
      };
    default:
      return {};
  }
}
