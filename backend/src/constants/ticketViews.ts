import { Prisma } from '@prisma/client';
import { ticketStatus, toDbStatusName } from './ticketCanon.js';

export const ticketViewKey = {
  allTickets: 'ALL_TICKETS',
  createdByMe: 'CREATED_BY_ME',
  assignedToMe: 'ASSIGNED_TO_ME',
  resolvedRelatedActive: 'RESOLVED_RELATED_ACTIVE',
  unassignedOpen: 'UNASSIGNED_OPEN',
  resolvedCreatedByMe: 'RESOLVED_CREATED_BY_ME'
} as const;

export type ticketViewKeyName = (typeof ticketViewKey)[keyof typeof ticketViewKey];
export type ticketViewRole = 'ADMIN' | 'TECH' | 'REQUESTER';

export type currentTicketUser = {
  id: number;
  role: string;
};

export const ticketViewDefinitions: Record<
  ticketViewKeyName,
  {
    label: string;
    description: string;
    rolesAllowed: ticketViewRole[];
  }
> = {
  [ticketViewKey.allTickets]: {
    label: 'All Tickets',
    description: 'Shows all tickets regardless of status.',
    rolesAllowed: ['ADMIN']
  },
  [ticketViewKey.createdByMe]: {
    label: 'Tickets Created by Me',
    description: 'Shows tickets created by the current user.',
    rolesAllowed: ['ADMIN', 'TECH', 'REQUESTER']
  },
  [ticketViewKey.assignedToMe]: {
    label: 'Tickets Assigned to Me',
    description: 'Shows tickets assigned to the current user.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  [ticketViewKey.resolvedRelatedActive]: {
    label: 'Resolved Tickets (Active & Related to Me)',
    description: 'Shows active resolved tickets created by or assigned to the current user.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  [ticketViewKey.unassignedOpen]: {
    label: 'Unassigned Open Tickets',
    description: 'Shows non-resolved tickets that are unassigned.',
    rolesAllowed: ['ADMIN', 'TECH']
  },
  [ticketViewKey.resolvedCreatedByMe]: {
    label: 'Resolved Tickets Created by Me',
    description: 'Shows resolved tickets created by the current user.',
    rolesAllowed: ['REQUESTER']
  }
};

export const isTicketViewKey = (value: string): value is ticketViewKeyName =>
  Object.values(ticketViewKey).includes(value as ticketViewKeyName);

export const isViewAllowedForRole = (viewKeyName: ticketViewKeyName, role: string) =>
  ticketViewDefinitions[viewKeyName].rolesAllowed.includes(role as ticketViewRole);

export function buildTicketWhere(viewKeyName: ticketViewKeyName, currentUser: currentTicketUser): Prisma.TicketWhereInput {
  switch (viewKeyName) {
    case ticketViewKey.allTickets:
      return {};
    case ticketViewKey.createdByMe:
      return { createdById: currentUser.id };
    case ticketViewKey.assignedToMe:
      return { assignedToId: currentUser.id };
    case ticketViewKey.resolvedRelatedActive:
      return {
        isActive: true,
        status: { name: toDbStatusName(ticketStatus.resolved) },
        OR: [{ createdById: currentUser.id }, { assignedToId: currentUser.id }]
      };
    case ticketViewKey.unassignedOpen:
      return {
        assignedToId: null,
        status: { name: { not: toDbStatusName(ticketStatus.resolved) } }
      };
    case ticketViewKey.resolvedCreatedByMe:
      return {
        createdById: currentUser.id,
        status: { name: toDbStatusName(ticketStatus.resolved) }
      };
    default:
      return {};
  }
}
