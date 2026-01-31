import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client.js';
import { addHistory } from '../services/historyService.js';
import { AuthRequest } from '../middleware/auth.js';
import { buildTicketQuery, ColumnFilterInput } from '../utils/ticketQueryBuilder.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function parseTicketId(id: string): number | null {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function listTickets(req: AuthRequest, res: Response) {
  const {
    statusId,
    status,
    priorityId,
    priority,
    ticketTypeId,
    typeId,
    type,
    assignedToMe,
    createdByMe,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    createdById,
    assignedToId,
    text,
    sortBy,
    sortDir,
    page,
    pageSize
  } = req.query as Record<string, string>;

  const baseWhere: Prisma.TicketWhereInput = {};
  if (statusId) baseWhere.statusId = statusId;
  if (priorityId) baseWhere.priorityId = priorityId;
  if (ticketTypeId || typeId) baseWhere.ticketTypeId = ticketTypeId ?? typeId;
  if (assignedToId) baseWhere.assignedToId = assignedToId;
  if (createdById) baseWhere.createdById = createdById;
  if (assignedToMe === 'true' && req.user) baseWhere.assignedToId = req.user.id;
  if (createdByMe === 'true' && req.user) baseWhere.createdById = req.user.id;

  const filters: Record<string, ColumnFilterInput> = {};
  if (status) {
    filters.status = { kind: 'text', op: 'Equals', value: status };
  }
  if (priority) {
    filters.priority = { kind: 'text', op: 'Equals', value: priority };
  }
  if (type) {
    filters.type = { kind: 'text', op: 'Equals', value: type };
  }

  const createdAtFilter: Record<string, Date> = {};
  if (createdFrom) {
    const parsed = new Date(createdFrom);
    if (!Number.isNaN(parsed.getTime())) createdAtFilter.gte = parsed;
  }
  if (createdTo) {
    const parsed = new Date(createdTo);
    if (!Number.isNaN(parsed.getTime())) createdAtFilter.lte = parsed;
  }
  if (Object.keys(createdAtFilter).length > 0) {
    baseWhere.createdAt = createdAtFilter;
  }

  const updatedAtFilter: Record<string, Date> = {};
  if (updatedFrom) {
    const parsed = new Date(updatedFrom);
    if (!Number.isNaN(parsed.getTime())) updatedAtFilter.gte = parsed;
  }
  if (updatedTo) {
    const parsed = new Date(updatedTo);
    if (!Number.isNaN(parsed.getTime())) updatedAtFilter.lte = parsed;
  }
  if (Object.keys(updatedAtFilter).length > 0) {
    baseWhere.updatedAt = updatedAtFilter;
  }

  const sortDirection = sortDir === 'asc' ? 'asc' : 'desc';
  const { where, orderBy } = buildTicketQuery({
    query: {
      q: text,
      filters,
      sort: sortBy ? { column: sortBy, direction: sortDirection } : null
    },
    baseWhere
  });

  const pageNumber = Number(page) || 1;
  const pageSizeNumber = Number(pageSize) || 50;
  const skip = pageNumber > 1 ? (pageNumber - 1) * pageSizeNumber : 0;

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      ticketType: true,
      priority: true,
      status: true,
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } }
    },
    orderBy,
    skip,
    take: pageSizeNumber
  });
  res.json(tickets);
}

export async function searchTickets(req: AuthRequest, res: Response) {
  const query = (req.query.q as string) ?? '';
  const limit = Number(req.query.limit) || 8;
  if (!query || query.trim().length < 2) {
    return res.json([]);
  }
  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { code: { contains: query } }
      ]
    },
    orderBy: { updatedAt: 'desc' },
    take: Math.min(limit, 20),
    include: {
      status: true,
      priority: true
    }
  });
  res.json(
    tickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      code: ticket.code,
      status: ticket.status.name,
      priority: ticket.priority.name
    }))
  );
}

export async function listRecentTickets(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const hours = Number(req.query.hours) || 48;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { createdById: req.user.id, createdAt: { gte: cutoff } },
        { updatedById: req.user.id, updatedAt: { gte: cutoff } }
      ]
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      status: true,
      priority: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true } }
    }
  });

  res.json(tickets);
}

export async function getTicket(req: Request, res: Response) {
  const parsedId = parseTicketId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid ticket id.' });
  }
  const ticket = await prisma.ticket.findUnique({
    where: { id: parsedId },
    include: {
      ticketType: true,
      priority: true,
      status: true,
      createdBy: true,
      assignedTo: true,
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
  const alreadyPrefixed = /^TM\d{9}\s-\s/i.test(title);

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        ticketTypeId,
        title,
        description,
        priorityId: usePriority,
        statusId: status.id,
        createdById: req.user!.id
      }
    });
    const code = `TM${created.id.toString().padStart(9, '0')}`;
    const updated = await tx.ticket.update({
      where: { id: created.id },
      data: {
        code,
        title: alreadyPrefixed ? title : `${code} - ${title}`
      }
    });
    return updated;
  });

  await addHistory({
    ticketId: ticket.id,
    actorId: req.user.id,
    eventType: 'CREATED',
    message: 'Ticket created',
    data: { title: ticket.title, description }
  });
  res.status(201).json(ticket);
}

export async function updateTicket(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const parsedId = parseTicketId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid ticket id.' });
  }
  const { description, priorityId } = req.body as { description?: string; priorityId?: string };
  const ticket = await prisma.ticket.findUnique({ where: { id: parsedId } });
  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }
  const updates: { description?: string; priorityId?: string; updatedById: string } = {
    updatedById: req.user.id
  };
  if (description) {
    updates.description = description;
  }
  if (priorityId) {
    updates.priorityId = priorityId;
  }
  if (!updates.description && !updates.priorityId) {
    return res.status(400).json({ message: 'Provide fields to update.' });
  }
  const updated = await prisma.ticket.update({ where: { id: parsedId }, data: updates });
  if (updates.description) {
    await addHistory({
      ticketId: parsedId,
      actorId: req.user.id,
      eventType: 'UPDATED',
      message: 'Ticket updated',
      data: { description: updates.description }
    });
  }
  if (updates.priorityId) {
    await addHistory({
      ticketId: parsedId,
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
  const parsedId = parseTicketId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid ticket id.' });
  }
  const { assigneeId } = req.body as { assigneeId: string };
  const ticket = await prisma.ticket.update({
    where: { id: parsedId },
    data: { assignedToId: assigneeId, updatedById: req.user.id }
  });
  await addHistory({
    ticketId: parsedId,
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
  const parsedId = parseTicketId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid ticket id.' });
  }
  const { statusId } = req.body as { statusId: string };
  const [status, currentTicket] = await Promise.all([
    prisma.status.findUnique({ where: { id: statusId } }),
    prisma.ticket.findUnique({ where: { id: parsedId }, include: { status: true } })
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
    where: { id: parsedId },
    data: {
      statusId,
      resolvedAt: status.name === 'Resuelto' ? new Date() : undefined,
      updatedById: req.user.id
    }
  });
  await addHistory({
    ticketId: parsedId,
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
  const parsedId = parseTicketId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid ticket id.' });
  }
  const { message, requestedFields } = req.body as { message: string; requestedFields?: string[] };
  const infoRequest = await prisma.infoRequest.create({
    data: {
      ticketId: parsedId,
      requesterTechId: req.user.id,
      message,
      requestedFields: requestedFields ? JSON.stringify(requestedFields) : undefined,
      status: 'OPEN'
    }
  });
  await addHistory({
    ticketId: parsedId,
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
  const parsedId = parseTicketId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid ticket id.' });
  }
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: parsedId }, include: { status: true } });
    if (!ticket || !ticket.status) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }
    if (req.user.role !== 'ADMIN') {
      const createdAt = ticket.createdAt.getTime();
      const now = Date.now();
      const isNew = ticket.status.name === 'Nuevo';
      if (!isNew || now - createdAt > ONE_DAY_MS) {
        return res.status(400).json({ message: 'Delete safeguard triggered. Only new tickets within 24h can be deleted.' });
      }
    }
    await prisma.ticket.delete({ where: { id: parsedId } });
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return res.status(409).json({ message: 'Cannot delete ticket because it is referenced by other records.' });
    }
    return res.status(500).json({ message: 'Failed to delete ticket.' });
  }
}

export async function deleteTicketsBulk(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const { ids } = req.body as { ids?: number[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids must be a non-empty array.' });
  }
  const parsedIds = ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (parsedIds.length !== ids.length) {
    return res.status(400).json({ message: 'ids must contain valid ticket ids.' });
  }

  if (req.user.role !== 'ADMIN') {
    const tickets = await prisma.ticket.findMany({
      where: { id: { in: parsedIds } },
      include: { status: true }
    });
    const now = Date.now();
    const blockedIds = tickets
      .filter((ticket) => {
        const isNew = ticket.status?.name === 'Nuevo';
        return !isNew || now - ticket.createdAt.getTime() > ONE_DAY_MS;
      })
      .map((ticket) => ticket.id);
    if (blockedIds.length > 0) {
      return res.status(400).json({
        message: 'Some tickets cannot be deleted due to safeguard rules.',
        blockedIds
      });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => tx.ticket.deleteMany({ where: { id: { in: parsedIds } } }));
    return res.json({ deletedCount: result.count });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return res.status(409).json({ message: 'Cannot delete ticket because it is referenced by other records.' });
    }
    return res.status(500).json({ message: 'Failed to delete tickets.' });
  }
}

export async function addComment(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const parsedId = parseTicketId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid ticket id.' });
  }
  const { message } = req.body as { message: string };
  await addHistory({
    ticketId: parsedId,
    actorId: req.user.id,
    eventType: 'COMMENT',
    message
  });
  res.status(201).json({ message: 'Comment added.' });
}
