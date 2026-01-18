import { Request, Response } from 'express';
import prisma from '../prisma/client.js';
import { addHistory } from '../services/historyService.js';
import { AuthRequest } from '../middleware/auth.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function listTickets(req: AuthRequest, res: Response) {
  const { statusId, priorityId, ticketTypeId, assignedToMe, createdByMe } = req.query as Record<string, string>;
  const filters: Record<string, unknown> = {};
  if (statusId) filters.statusId = statusId;
  if (priorityId) filters.priorityId = priorityId;
  if (ticketTypeId) filters.ticketTypeId = ticketTypeId;
  if (assignedToMe === 'true' && req.user) filters.assigneeId = req.user.id;
  if (createdByMe === 'true' && req.user) filters.creatorId = req.user.id;

  const tickets = await prisma.ticket.findMany({
    where: filters,
    include: {
      ticketType: true,
      priority: true,
      status: true,
      creator: true,
      assignee: true
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(tickets);
}

export async function getTicket(req: Request, res: Response) {
  const { id } = req.params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      ticketType: true,
      priority: true,
      status: true,
      creator: true,
      assignee: true,
      attachments: true,
      history: { orderBy: { createdAt: 'asc' }, include: { actor: true } },
      infoRequests: { include: { requesterTech: true, responses: { include: { responder: true } } } }
    }
  });
  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }
  res.json(ticket);
}

export async function createTicket(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const { ticketTypeId, description, priorityId, title2 } = req.body as {
    ticketTypeId: string;
    description: string;
    priorityId?: string;
    title2?: string;
  };
  const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId }, include: { defaultPriority: true } });
  const status = await prisma.status.findFirst({ where: { name: 'Nuevo' } });
  if (!ticketType || !status) {
    return res.status(400).json({ message: 'Invalid ticket type or status.' });
  }
  const title = ticketType.name === 'OTROS' ? title2 : ticketType.name;
  if (!title) {
    return res.status(400).json({ message: 'Custom title required for OTROS.' });
  }
  const usePriority = req.user.role === 'REQUESTER' ? ticketType.defaultPriorityId : (priorityId ?? ticketType.defaultPriorityId);

  const ticket = await prisma.ticket.create({
    data: {
      ticketTypeId,
      title,
      description,
      priorityId: usePriority,
      statusId: status.id,
      creatorId: req.user.id
    }
  });
  await addHistory({
    ticketId: ticket.id,
    actorId: req.user.id,
    eventType: 'CREATED',
    message: 'Ticket created',
    data: { title, description }
  });
  res.status(201).json(ticket);
}

export async function updateTicket(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const { id } = req.params;
  const { description, priorityId } = req.body as { description?: string; priorityId?: string };
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }
  const updates: { description?: string; priorityId?: string } = {};
  if (description && (ticket.creatorId === req.user.id || req.user.role !== 'REQUESTER')) {
    updates.description = description;
  }
  if (priorityId && req.user.role !== 'REQUESTER') {
    updates.priorityId = priorityId;
  }
  const updated = await prisma.ticket.update({ where: { id }, data: updates });
  if (updates.description) {
    await addHistory({
      ticketId: id,
      actorId: req.user.id,
      eventType: 'UPDATED',
      message: 'Ticket updated',
      data: { description: updates.description }
    });
  }
  if (updates.priorityId) {
    await addHistory({
      ticketId: id,
      actorId: req.user.id,
      eventType: 'PRIORITY_CHANGED',
      message: 'Priority updated',
      data: { priorityId: updates.priorityId }
    });
  }
  res.json(updated);
}

export async function assignTicket(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const { id } = req.params;
  const { assigneeId } = req.body as { assigneeId: string };
  const ticket = await prisma.ticket.update({ where: { id }, data: { assigneeId } });
  await addHistory({
    ticketId: id,
    actorId: req.user.id,
    eventType: 'ASSIGNED',
    message: 'Ticket assigned',
    data: { assigneeId }
  });
  res.json(ticket);
}

export async function changeStatus(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const { id } = req.params;
  const { statusId } = req.body as { statusId: string };
  const [status, currentTicket] = await Promise.all([
    prisma.status.findUnique({ where: { id: statusId } }),
    prisma.ticket.findUnique({ where: { id }, include: { status: true } })
  ]);
  if (!status || !currentTicket) {
    return res.status(400).json({ message: 'Invalid status.' });
  }
  const allowedTransitions: Record<string, string[]> = {
    Nuevo: ['En progreso', 'En espera'],
    'En progreso': ['En espera', 'Resuelto'],
    'En espera': ['En progreso', 'Resuelto'],
    Resuelto: ['Cerrado'],
    Cerrado: []
  };
  const currentStatus = currentTicket.status.name;
  const allowed = allowedTransitions[currentStatus] ?? [];
  if (!allowed.includes(status.name)) {
    return res.status(400).json({ message: `Cannot move from ${currentStatus} to ${status.name}.` });
  }
  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      statusId,
      resolvedAt: status.name === 'Resuelto' ? new Date() : undefined
    }
  });
  await addHistory({
    ticketId: id,
    actorId: req.user.id,
    eventType: 'STATUS_CHANGED',
    message: `Status changed to ${status.name}`,
    data: { statusId }
  });
  res.json(ticket);
}

export async function requestInfo(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const { id } = req.params;
  const { message, requestedFields } = req.body as { message: string; requestedFields?: string[] };
  const infoRequest = await prisma.infoRequest.create({
    data: {
      ticketId: id,
      requesterTechId: req.user.id,
      message,
      requestedFields: requestedFields ? JSON.stringify(requestedFields) : undefined,
      status: 'OPEN'
    }
  });
  await addHistory({
    ticketId: id,
    actorId: req.user.id,
    eventType: 'INFO_REQUESTED',
    message
  });
  res.status(201).json(infoRequest);
}

export async function respondInfo(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const { id } = req.params;
  const { message } = req.body as { message: string };
  const response = await prisma.infoResponse.create({
    data: {
      infoRequestId: id,
      responderId: req.user.id,
      message
    }
  });
  const infoRequest = await prisma.infoRequest.findUnique({ where: { id } });
  if (infoRequest && req.file) {
    await prisma.attachment.create({
      data: {
        ticketId: infoRequest.ticketId,
        uploaderId: req.user.id,
        originalName: req.file.originalname,
        storagePath: req.file.path,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size
      }
    });
    await addHistory({
      ticketId: infoRequest.ticketId,
      actorId: req.user.id,
      eventType: 'ATTACHMENT_ADDED',
      message: req.file.originalname
    });
  }
  if (infoRequest) {
    await addHistory({
      ticketId: infoRequest.ticketId,
      actorId: req.user.id,
      eventType: 'INFO_PROVIDED',
      message
    });
  }
  res.status(201).json(response);
}

export async function deleteTicket(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const { id } = req.params;
  const ticket = await prisma.ticket.findUnique({ where: { id }, include: { status: true } });
  if (!ticket || !ticket.status) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }
  const createdAt = ticket.createdAt.getTime();
  const now = Date.now();
  const isNew = ticket.status.name === 'Nuevo';
  if (!isNew || now - createdAt > ONE_DAY_MS) {
    return res.status(400).json({ message: 'Delete safeguard triggered. Only new tickets within 24h can be deleted.' });
  }
  await prisma.ticket.delete({ where: { id } });
  res.status(204).send();
}

export async function addComment(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const { id } = req.params;
  const { message } = req.body as { message: string };
  await addHistory({
    ticketId: id,
    actorId: req.user.id,
    eventType: 'COMMENT',
    message
  });
  res.status(201).json({ message: 'Comment added.' });
}
