import prisma from '../prisma/client.js';

export async function addHistory({
  ticketId,
  actorId,
  eventType,
  message,
  data
}: {
  ticketId: number;
  actorId: string;
  eventType: string;
  message?: string;
  data?: Record<string, unknown>;
}) {
  await prisma.ticketHistory.create({
    data: {
      ticketId,
      actorId,
      eventType,
      message,
      dataJson: data ? JSON.stringify(data) : undefined
    }
  });
}
