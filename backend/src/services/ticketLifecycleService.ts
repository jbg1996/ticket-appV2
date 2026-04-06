import prisma from '../prisma/client.js';
import { TICKET_STATUS } from '../constants/ticketCanon.js';

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export async function applyResolvedTicketAutoClosure(referenceDate = new Date()) {
  const cutoff = new Date(referenceDate.getTime() - FIVE_DAYS_MS);
  const [resolvedStatus, closedStatus] = await Promise.all([
    prisma.status.findFirst({ where: { name: TICKET_STATUS.RESOLVED }, orderBy: { sortOrder: 'asc' } }),
    prisma.status.findFirst({ where: { name: TICKET_STATUS.CLOSED }, orderBy: { sortOrder: 'asc' } })
  ]);

  if (!resolvedStatus || !closedStatus) {
    return { updatedCount: 0 };
  }

  const result = await prisma.ticket.updateMany({
    where: {
      status: { name: TICKET_STATUS.RESOLVED },
      resolvedAt: { lte: cutoff }
    },
    data: {
      statusId: closedStatus.id,
      isActive: false
    }
  });

  return { updatedCount: result.count };
}
