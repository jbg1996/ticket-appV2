import { describe, it, expect } from 'vitest';
import {
  TICKET_VIEW_KEY,
  buildTicketWhere,
  isTicketViewKey,
  isViewAllowedForRole
} from '../src/constants/ticketViews.js';
import { canonicalTicketStatus } from '../src/constants/ticketCanon.js';

describe('ticket view definitions', () => {
  it('validates known view keys', () => {
    expect(isTicketViewKey(TICKET_VIEW_KEY.ALL_TICKETS)).toBe(true);
    expect(isTicketViewKey('INVALID_VIEW')).toBe(false);
  });

  it('checks role permissions', () => {
    expect(isViewAllowedForRole(TICKET_VIEW_KEY.ALL_TICKETS, 'ADMIN')).toBe(true);
    expect(isViewAllowedForRole(TICKET_VIEW_KEY.ALL_TICKETS, 'TECH')).toBe(false);
    expect(isViewAllowedForRole(TICKET_VIEW_KEY.RESOLVED_CREATED_BY_ME, 'REQUESTER')).toBe(true);
  });

  it('builds the resolved related active filter', () => {
    const where = buildTicketWhere(TICKET_VIEW_KEY.RESOLVED_RELATED_ACTIVE, { id: 77, role: 'TECH' });
    expect(where).toEqual({
      isActive: true,
      status: { code: canonicalTicketStatus.resolved },
      OR: [{ createdById: 77 }, { assignedToId: 77 }]
    });
  });

  it('builds the unassigned open filter', () => {
    const where = buildTicketWhere(TICKET_VIEW_KEY.UNASSIGNED_OPEN, { id: 77, role: 'TECH' });
    expect(where).toEqual({
      assignedToId: null,
      status: { code: { not: canonicalTicketStatus.resolved } }
    });
  });
});
