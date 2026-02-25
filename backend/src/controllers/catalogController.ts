import { Request, Response } from 'express';
import prisma from '../prisma/client.js';
import { parseId, parseOptionalId } from '../utils/parseId.js';
import {
  toAppPriorityName,
  toAppStatusName,
  toAppTypeName,
  toDbPriorityName,
  toDbStatusName,
  toDbTypeName
} from '../constants/ticketCanon.js';

export async function listUserTypes(_req: Request, res: Response) {
  const items = await prisma.userType.findMany();
  res.json(items);
}

export async function listStatuses(_req: Request, res: Response) {
  const items = await prisma.status.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(items.map((item) => ({ ...item, name: toAppStatusName(item.name) })));
}

export async function createStatus(req: Request, res: Response) {
  const { name, sortOrder, color } = req.body as { name?: string; sortOrder?: number; color?: string };
  const dbName = name ? toDbStatusName(name.trim()) : undefined;
  if (!dbName || Number.isNaN(Number(sortOrder))) {
    console.warn('createStatus validation failed', { name, sortOrder });
    return res.status(400).json({ message: 'Name and sortOrder are required.' });
  }
  const existing = await prisma.status.findFirst({ where: { name: dbName } });
  if (existing) {
    return res.status(400).json({ message: 'Status name already exists.' });
  }
  const status = await prisma.status.create({
    data: { name: dbName, sortOrder: Number(sortOrder), color: color?.trim() || undefined }
  });
  console.info('Created status', { id: status.id });
  res.status(201).json({ ...status, name: toAppStatusName(status.name) });
}

export async function updateStatus(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid status id.' });
  }
  const { name, sortOrder, color } = req.body as { name?: string; sortOrder?: number; color?: string };
  const dbName = name ? toDbStatusName(name.trim()) : undefined;
  if (!name && typeof sortOrder === 'undefined' && typeof color === 'undefined') {
    return res.status(400).json({ message: 'Provide name, sortOrder, or color to update.' });
  }
  const existing = await prisma.status.findUnique({ where: { id: parsedId } });
  if (!existing) {
    return res.status(404).json({ message: 'Status not found.' });
  }
  if (dbName) {
    const duplicate = await prisma.status.findFirst({ where: { name: dbName, NOT: { id: parsedId } } });
    if (duplicate) {
      return res.status(400).json({ message: 'Status name already exists.' });
    }
  }
  const status = await prisma.status.update({
    where: { id: parsedId },
    data: {
      name: dbName,
      sortOrder: typeof sortOrder === 'undefined' ? undefined : Number(sortOrder),
      color: typeof color === 'undefined' ? undefined : color.trim()
    }
  });
  console.info('Updated status', { id: parsedId });
  res.json({ ...status, name: toAppStatusName(status.name) });
}

export async function deleteStatus(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid status id.' });
  }
  const existing = await prisma.status.findUnique({ where: { id: parsedId } });
  if (!existing) {
    return res.status(404).json({ message: 'Status not found.' });
  }
  await prisma.status.delete({ where: { id: parsedId } });
  console.info('Deleted status', { id: parsedId });
  res.status(204).send();
}

export async function listPriorities(_req: Request, res: Response) {
  const items = await prisma.priority.findMany();
  res.json(items.map((item) => ({ ...item, name: toAppPriorityName(item.name) })));
}

export async function createPriority(req: Request, res: Response) {
  const { name, color } = req.body as { name?: string; color?: string };
  const dbName = name ? toDbPriorityName(name.trim()) : undefined;
  if (!dbName || !color) {
    console.warn('createPriority validation failed', { name, color });
    return res.status(400).json({ message: 'Name and color are required.' });
  }
  const existing = await prisma.priority.findFirst({ where: { name: dbName } });
  if (existing) {
    return res.status(400).json({ message: 'Priority name already exists.' });
  }
  const priority = await prisma.priority.create({ data: { name: dbName, color: color.trim() } });
  console.info('Created priority', { id: priority.id });
  res.status(201).json({ ...priority, name: toAppPriorityName(priority.name) });
}

export async function updatePriority(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid priority id.' });
  }
  const { name, color } = req.body as { name?: string; color?: string };
  const dbName = name ? toDbPriorityName(name.trim()) : undefined;
  if (!name && !color) {
    return res.status(400).json({ message: 'Provide name or color to update.' });
  }
  const existing = await prisma.priority.findUnique({ where: { id: parsedId } });
  if (!existing) {
    return res.status(404).json({ message: 'Priority not found.' });
  }
  if (dbName) {
    const duplicate = await prisma.priority.findFirst({ where: { name: dbName, NOT: { id: parsedId } } });
    if (duplicate) {
      return res.status(400).json({ message: 'Priority name already exists.' });
    }
  }
  const priority = await prisma.priority.update({
    where: { id: parsedId },
    data: { name: dbName, color: color?.trim() }
  });
  console.info('Updated priority', { id: parsedId });
  res.json({ ...priority, name: toAppPriorityName(priority.name) });
}

export async function deletePriority(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid priority id.' });
  }
  const existing = await prisma.priority.findUnique({ where: { id: parsedId } });
  if (!existing) {
    return res.status(404).json({ message: 'Priority not found.' });
  }
  await prisma.priority.delete({ where: { id: parsedId } });
  console.info('Deleted priority', { id: parsedId });
  res.status(204).send();
}

export async function listTicketTypes(_req: Request, res: Response) {
  const items = await prisma.ticketType.findMany({ include: { defaultPriority: true } });
  res.json(items.map((item) => ({ ...item, name: toAppTypeName(item.name) })));
}

export async function createTicketType(req: Request, res: Response) {
  const { name, description, defaultPriorityId } = req.body as { name?: string; description?: string; defaultPriorityId?: number };
  const dbName = name ? toDbTypeName(name.trim()) : undefined;
  if (!dbName || !description || !defaultPriorityId) {
    console.warn('createTicketType validation failed', { name, description, defaultPriorityId });
    return res.status(400).json({ message: 'Name, description, and defaultPriorityId are required.' });
  }
  const parsedDefaultPriorityId = parseId(defaultPriorityId);
  if (!parsedDefaultPriorityId) {
    return res.status(400).json({ message: 'Default priority not found.' });
  }
  const existing = await prisma.ticketType.findFirst({ where: { name: dbName } });
  if (existing) {
    return res.status(400).json({ message: 'Ticket type name already exists.' });
  }
  const defaultPriority = await prisma.priority.findUnique({ where: { id: parsedDefaultPriorityId } });
  if (!defaultPriority) {
    return res.status(400).json({ message: 'Default priority not found.' });
  }
  const ticketTypeRecord = await prisma.ticketType.create({
    data: { name: dbName, description: description.trim(), defaultPriorityId: parsedDefaultPriorityId }
  });
  console.info('Created ticket type', { id: ticketTypeRecord.id });
  res.status(201).json({ ...ticketTypeRecord, name: toAppTypeName(ticketTypeRecord.name) });
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
  const dbName = name ? toDbTypeName(name.trim()) : undefined;
  if (!name && !description && !defaultPriorityId) {
    return res.status(400).json({ message: 'Provide name, description, or defaultPriorityId to update.' });
  }
  const existing = await prisma.ticketType.findUnique({ where: { id: parsedId } });
  if (!existing) {
    return res.status(404).json({ message: 'Ticket type not found.' });
  }
  if (dbName) {
    const duplicate = await prisma.ticketType.findFirst({ where: { name: dbName, NOT: { id: parsedId } } });
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
  const ticketTypeRecord = await prisma.ticketType.update({
    where: { id: parsedId },
    data: { name: dbName, description: description?.trim(), defaultPriorityId: parsedDefaultPriorityId }
  });
  console.info('Updated ticket type', { id: parsedId });
  res.json({ ...ticketTypeRecord, name: toAppTypeName(ticketTypeRecord.name) });
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
  await prisma.ticketType.delete({ where: { id: parsedId } });
  console.info('Deleted ticket type', { id: parsedId });
  res.status(204).send();
}
