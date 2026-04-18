import { Request, Response } from 'express';
import prisma from '../prisma/client.js';
import { parseId, parseOptionalId } from '../utils/parseId.js';
import { TICKET_TYPE } from '../constants/ticketCanon.js';

export async function listUserTypes(_req: Request, res: Response) {
  const items = await prisma.userType.findMany();
  res.json(items);
}

export async function listStatuses(_req: Request, res: Response) {
  const items = await prisma.status.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(items);
}

export async function createStatus(req: Request, res: Response) {
  return res.status(403).json({ message: 'Creating statuses is not allowed.' });
}

export async function updateStatus(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid status id.' });
  }
  const { name, sortOrder, color } = req.body as { name?: string; sortOrder?: number; color?: string };
  if (typeof name !== 'undefined' || typeof sortOrder !== 'undefined') {
    return res.status(400).json({ message: 'Only color can be updated for statuses.' });
  }
  if (typeof color === 'undefined') {
    return res.status(400).json({ message: 'Provide color to update.' });
  }
  const existing = await prisma.status.findUnique({ where: { id: parsedId } });
  if (!existing) {
    return res.status(404).json({ message: 'Status not found.' });
  }
  const status = await prisma.status.update({
    where: { id: parsedId },
    data: {
      color: color.trim()
    }
  });
  console.info('Updated status', { id: parsedId });
  res.json(status);
}

export async function deleteStatus(req: Request, res: Response) {
  return res.status(403).json({ message: 'Deleting statuses is not allowed.' });
}

export async function listPriorities(_req: Request, res: Response) {
  const items = await prisma.priority.findMany();
  res.json(items);
}

export async function createPriority(req: Request, res: Response) {
  return res.status(403).json({ message: 'Creating priorities is not allowed.' });
}

export async function updatePriority(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid priority id.' });
  }
  const { name, color } = req.body as { name?: string; color?: string };
  if (typeof name !== 'undefined') {
    return res.status(400).json({ message: 'Only color can be updated for priorities.' });
  }
  if (!color) {
    return res.status(400).json({ message: 'Provide color to update.' });
  }
  const existing = await prisma.priority.findUnique({ where: { id: parsedId } });
  if (!existing) {
    return res.status(404).json({ message: 'Priority not found.' });
  }
  const priority = await prisma.priority.update({
    where: { id: parsedId },
    data: { color: color.trim() }
  });
  console.info('Updated priority', { id: parsedId });
  res.json(priority);
}

export async function deletePriority(req: Request, res: Response) {
  return res.status(403).json({ message: 'Deleting priorities is not allowed.' });
}

export async function listTicketTypes(_req: Request, res: Response) {
  const items = await prisma.ticketType.findMany({ include: { defaultPriority: true } });
  res.json(items);
}

export async function createTicketType(req: Request, res: Response) {
  const { name, description, defaultPriorityId } = req.body as { name?: string; description?: string; defaultPriorityId?: number };
  if (!name || !description || !defaultPriorityId) {
    console.warn('createTicketType validation failed', { name, description, defaultPriorityId });
    return res.status(400).json({ message: 'Name, description, and defaultPriorityId are required.' });
  }
  const parsedDefaultPriorityId = parseId(defaultPriorityId);
  if (!parsedDefaultPriorityId) {
    return res.status(400).json({ message: 'Default priority not found.' });
  }
  const existing = await prisma.ticketType.findFirst({ where: { name } });
  if (existing) {
    return res.status(400).json({ message: 'Ticket type name already exists.' });
  }
  const defaultPriority = await prisma.priority.findUnique({ where: { id: parsedDefaultPriorityId } });
  if (!defaultPriority) {
    return res.status(400).json({ message: 'Default priority not found.' });
  }
  const ticketType = await prisma.ticketType.create({
    data: { name: name.trim(), description: description.trim(), defaultPriorityId: parsedDefaultPriorityId }
  });
  console.info('Created ticket type', { id: ticketType.id });
  res.status(201).json(ticketType);
}

export async function updateTicketType(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid ticket type id.' });
  }
  const { name, description, defaultPriorityId } = req.body as {
    name?: string;
    description?: string;
    defaultPriorityId?: number;
  };
  if (!name && !description && !defaultPriorityId) {
    return res.status(400).json({ message: 'Provide name, description, or defaultPriorityId to update.' });
  }
  const existing = await prisma.ticketType.findUnique({ where: { id: parsedId } });
  if (!existing) {
    return res.status(404).json({ message: 'Ticket type not found.' });
  }
  if (name) {
    const duplicate = await prisma.ticketType.findFirst({ where: { name, NOT: { id: parsedId } } });
    if (duplicate) {
      return res.status(400).json({ message: 'Ticket type name already exists.' });
    }
  }
  const parsedDefaultPriorityId = parseOptionalId(defaultPriorityId);
  if (defaultPriorityId && !parsedDefaultPriorityId) {
    return res.status(400).json({ message: 'Default priority not found.' });
  }
  if (parsedDefaultPriorityId) {
    const defaultPriority = await prisma.priority.findUnique({ where: { id: parsedDefaultPriorityId } });
    if (!defaultPriority) {
      return res.status(400).json({ message: 'Default priority not found.' });
    }
  }
  const ticketType = await prisma.ticketType.update({
    where: { id: parsedId },
    data: { name: name?.trim(), description: description?.trim(), defaultPriorityId: parsedDefaultPriorityId }
  });
  console.info('Updated ticket type', { id: parsedId });
  res.json(ticketType);
}

export async function deleteTicketType(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid ticket type id.' });
  }
  const existing = await prisma.ticketType.findUnique({ where: { id: parsedId } });
  if (!existing) {
    return res.status(404).json({ message: 'Ticket type not found.' });
  }
  if (existing.name.trim().toUpperCase() === TICKET_TYPE.OTHER) {
    return res.status(400).json({ message: 'Ticket type OTHER cannot be deleted.' });
  }
  await prisma.ticketType.delete({ where: { id: parsedId } });
  console.info('Deleted ticket type', { id: parsedId });
  res.status(204).send();
}
