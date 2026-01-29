import { Request, Response } from 'express';
import prisma from '../prisma/client.js';

export async function listUserTypes(_req: Request, res: Response) {
  const items = await prisma.userType.findMany();
  res.json(items);
}

export async function listStatuses(_req: Request, res: Response) {
  const items = await prisma.status.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(items);
}

export async function createStatus(req: Request, res: Response) {
  const { name, sortOrder } = req.body as { name?: string; sortOrder?: number };
  if (!name || typeof name !== 'string' || Number.isNaN(Number(sortOrder))) {
    console.warn('createStatus validation failed', { name, sortOrder });
    return res.status(400).json({ message: 'Name and sortOrder are required.' });
  }
  const existing = await prisma.status.findFirst({ where: { name } });
  if (existing) {
    return res.status(400).json({ message: 'Status name already exists.' });
  }
  const status = await prisma.status.create({ data: { name: name.trim(), sortOrder: Number(sortOrder) } });
  console.info('Created status', { id: status.id });
  res.status(201).json(status);
}

export async function updateStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { name, sortOrder } = req.body as { name?: string; sortOrder?: number };
  if (!name && typeof sortOrder === 'undefined') {
    return res.status(400).json({ message: 'Provide name or sortOrder to update.' });
  }
  const existing = await prisma.status.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: 'Status not found.' });
  }
  if (name) {
    const duplicate = await prisma.status.findFirst({ where: { name, NOT: { id } } });
    if (duplicate) {
      return res.status(400).json({ message: 'Status name already exists.' });
    }
  }
  const status = await prisma.status.update({
    where: { id },
    data: { name: name?.trim(), sortOrder: typeof sortOrder === 'undefined' ? undefined : Number(sortOrder) }
  });
  console.info('Updated status', { id });
  res.json(status);
}

export async function deleteStatus(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.status.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: 'Status not found.' });
  }
  await prisma.status.delete({ where: { id } });
  console.info('Deleted status', { id });
  res.status(204).send();
}

export async function listPriorities(_req: Request, res: Response) {
  const items = await prisma.priority.findMany();
  res.json(items);
}

export async function createPriority(req: Request, res: Response) {
  const { name, color } = req.body as { name?: string; color?: string };
  if (!name || !color) {
    console.warn('createPriority validation failed', { name, color });
    return res.status(400).json({ message: 'Name and color are required.' });
  }
  const existing = await prisma.priority.findFirst({ where: { name } });
  if (existing) {
    return res.status(400).json({ message: 'Priority name already exists.' });
  }
  const priority = await prisma.priority.create({ data: { name: name.trim(), color: color.trim() } });
  console.info('Created priority', { id: priority.id });
  res.status(201).json(priority);
}

export async function updatePriority(req: Request, res: Response) {
  const { id } = req.params;
  const { name, color } = req.body as { name?: string; color?: string };
  if (!name && !color) {
    return res.status(400).json({ message: 'Provide name or color to update.' });
  }
  const existing = await prisma.priority.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: 'Priority not found.' });
  }
  if (name) {
    const duplicate = await prisma.priority.findFirst({ where: { name, NOT: { id } } });
    if (duplicate) {
      return res.status(400).json({ message: 'Priority name already exists.' });
    }
  }
  const priority = await prisma.priority.update({
    where: { id },
    data: { name: name?.trim(), color: color?.trim() }
  });
  console.info('Updated priority', { id });
  res.json(priority);
}

export async function deletePriority(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.priority.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: 'Priority not found.' });
  }
  await prisma.priority.delete({ where: { id } });
  console.info('Deleted priority', { id });
  res.status(204).send();
}

export async function listTicketTypes(_req: Request, res: Response) {
  const items = await prisma.ticketType.findMany({ include: { defaultPriority: true } });
  res.json(items);
}

export async function createTicketType(req: Request, res: Response) {
  const { name, description, defaultPriorityId } = req.body as { name?: string; description?: string; defaultPriorityId?: string };
  if (!name || !description || !defaultPriorityId) {
    console.warn('createTicketType validation failed', { name, description, defaultPriorityId });
    return res.status(400).json({ message: 'Name, description, and defaultPriorityId are required.' });
  }
  const existing = await prisma.ticketType.findFirst({ where: { name } });
  if (existing) {
    return res.status(400).json({ message: 'Ticket type name already exists.' });
  }
  const defaultPriority = await prisma.priority.findUnique({ where: { id: defaultPriorityId } });
  if (!defaultPriority) {
    return res.status(400).json({ message: 'Default priority not found.' });
  }
  const ticketType = await prisma.ticketType.create({
    data: { name: name.trim(), description: description.trim(), defaultPriorityId }
  });
  console.info('Created ticket type', { id: ticketType.id });
  res.status(201).json(ticketType);
}

export async function updateTicketType(req: Request, res: Response) {
  const { id } = req.params;
  const { name, description, defaultPriorityId } = req.body as {
    name?: string;
    description?: string;
    defaultPriorityId?: string;
  };
  if (!name && !description && !defaultPriorityId) {
    return res.status(400).json({ message: 'Provide name, description, or defaultPriorityId to update.' });
  }
  const existing = await prisma.ticketType.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: 'Ticket type not found.' });
  }
  if (name) {
    const duplicate = await prisma.ticketType.findFirst({ where: { name, NOT: { id } } });
    if (duplicate) {
      return res.status(400).json({ message: 'Ticket type name already exists.' });
    }
  }
  if (defaultPriorityId) {
    const defaultPriority = await prisma.priority.findUnique({ where: { id: defaultPriorityId } });
    if (!defaultPriority) {
      return res.status(400).json({ message: 'Default priority not found.' });
    }
  }
  const ticketType = await prisma.ticketType.update({
    where: { id },
    data: { name: name?.trim(), description: description?.trim(), defaultPriorityId }
  });
  console.info('Updated ticket type', { id });
  res.json(ticketType);
}

export async function deleteTicketType(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.ticketType.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: 'Ticket type not found.' });
  }
  await prisma.ticketType.delete({ where: { id } });
  console.info('Deleted ticket type', { id });
  res.status(204).send();
}
