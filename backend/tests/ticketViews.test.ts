import { describe, it, expect } from 'vitest';
import {
  ticketViewKey,
  buildTicketWhere,
  isTicketViewKey,
  isViewAllowedForRole
} from '../src/constants/ticketViews.js';
import { ticketStatus, toDbStatusName } from '../src/constants/ticketCanon.js';

describe('ticket view definitions', () => {
  it('validates known view keys', () => {
    expect(isTicketViewKey(ticketViewKey.allTickets)).toBe(true);
    expect(isTicketViewKey('INVALID_VIEW')).toBe(false);
  });

  it('checks role permissions', () => {
    expect(isViewAllowedForRole(ticketViewKey.allTickets, 'ADMIN')).toBe(true);
    expect(isViewAllowedForRole(ticketViewKey.allTickets, 'TECH')).toBe(false);
    expect(isViewAllowedForRole(ticketViewKey.resolvedCreatedByMe, 'REQUESTER')).toBe(true);
  });

  it('builds the resolved related active filter', () => {
    const where = buildTicketWhere(ticketViewKey.resolvedRelatedActive, { id: 77, role: 'TECH' });
    expect(where).toEqual({
      isActive: true,
      status: { name: toDbStatusName(ticketStatus.resolved) },
      OR: [{ createdById: 77 }, { assignedToId: 77 }]
    });
  });

  it('builds the unassigned open filter', () => {
    const where = buildTicketWhere(ticketViewKey.unassignedOpen, { id: 77, role: 'TECH' });
    expect(where).toEqual({
      assignedToId: null,
      status: { name: { not: toDbStatusName(ticketStatus.resolved) } }
    });
  });
});
