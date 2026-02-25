import { Request, Response } from 'express';
import prisma from '../prisma/client.js';
import { parseId, parseOptionalId } from '../utils/parseId.js';

const toCode = (value: string) =>
  value
    .trim()
    .replace(/[\s-]+/g, '_')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.toLowerCase())
    .map((segment, index) => (index === 0 ? segment : `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`))
    .join('');

const toLabel = (value: string) =>
  toCode(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());

const pickCodeAndLabel = (payload: { code?: string; label?: string; name?: string }) => {
  const source = payload.code ?? payload.name;
  if (!source) return { code: undefined, label: payload.label };
  const code = toCode(source);
  return { code, label: payload.label?.trim() || toLabel(code) };
};

export async function listUserTypes(_req: Request, res: Response) {
  const items = await prisma.userType.findMany();
  res.json(items);
}

export async function listStatuses(_req: Request, res: Response) {
  const items = await prisma.status.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(items);
}

export async function createStatus(req: Request, res: Response) {
  const { sortOrder, color } = req.body as { sortOrder?: number; color?: string };
  const { code, label } = pickCodeAndLabel(req.body as { code?: string; label?: string; name?: string });
  if (!code || Number.isNaN(Number(sortOrder))) {
    return res.status(400).json({ message: 'Code and sortOrder are required.' });
  }
  const existing = await prisma.status.findFirst({ where: { code } });
  if (existing) {
    return res.status(400).json({ message: 'Status code already exists.' });
  }
  const status = await prisma.status.create({
    data: { name: code, code, label: label ?? toLabel(code), sortOrder: Number(sortOrder), color: color?.trim() || undefined }
  });
  res.status(201).json(status);
}

export async function updateStatus(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid status id.' });
  }
  const { sortOrder, color } = req.body as { sortOrder?: number; color?: string };
  const { code, label } = pickCodeAndLabel(req.body as { code?: string; label?: string; name?: string });
  if (!code && typeof sortOrder === 'undefined' && typeof color === 'undefined' && typeof label === 'undefined') {
    return res.status(400).json({ message: 'Provide code, label, sortOrder, or color to update.' });
  }
  if (code) {
    const duplicate = await prisma.status.findFirst({ where: { code, NOT: { id: parsedId } } });
    if (duplicate) {
      return res.status(400).json({ message: 'Status code already exists.' });
    }
  }
  const status = await prisma.status.update({
    where: { id: parsedId },
    data: {
      code,
      name: code,
      label: typeof label === 'undefined' ? undefined : label,
      sortOrder: typeof sortOrder === 'undefined' ? undefined : Number(sortOrder),
      color: typeof color === 'undefined' ? undefined : color.trim()
    }
  });
  res.json(status);
}

export async function deleteStatus(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) return res.status(400).json({ message: 'Invalid status id.' });
  await prisma.status.delete({ where: { id: parsedId } });
  res.status(204).send();
}

export async function listPriorities(_req: Request, res: Response) {
  const items = await prisma.priority.findMany();
  res.json(items);
}

export async function createPriority(req: Request, res: Response) {
  const { color } = req.body as { color?: string };
  const { code, label } = pickCodeAndLabel(req.body as { code?: string; label?: string; name?: string });
  if (!code || !color) return res.status(400).json({ message: 'Code and color are required.' });
  const existing = await prisma.priority.findFirst({ where: { code } });
  if (existing) return res.status(400).json({ message: 'Priority code already exists.' });
  const priority = await prisma.priority.create({ data: { name: code, code, label: label ?? toLabel(code), color: color.trim() } });
  res.status(201).json(priority);
}

export async function updatePriority(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) return res.status(400).json({ message: 'Invalid priority id.' });
  const { color } = req.body as { color?: string };
  const { code, label } = pickCodeAndLabel(req.body as { code?: string; label?: string; name?: string });
  if (!code && !color && typeof label === 'undefined') return res.status(400).json({ message: 'Provide code, label or color to update.' });
  if (code) {
    const duplicate = await prisma.priority.findFirst({ where: { code, NOT: { id: parsedId } } });
    if (duplicate) return res.status(400).json({ message: 'Priority code already exists.' });
  }
  const priority = await prisma.priority.update({
    where: { id: parsedId },
    data: { code, name: code, label: typeof label === 'undefined' ? undefined : label, color: color?.trim() }
  });
  res.json(priority);
}

export async function deletePriority(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) return res.status(400).json({ message: 'Invalid priority id.' });
  await prisma.priority.delete({ where: { id: parsedId } });
  res.status(204).send();
}

export async function listTicketTypes(_req: Request, res: Response) {
  const items = await prisma.ticketType.findMany({ include: { defaultPriority: true } });
  res.json(items);
}

export async function createTicketType(req: Request, res: Response) {
  const { description, defaultPriorityId } = req.body as { description?: string; defaultPriorityId?: number };
  const { code, label } = pickCodeAndLabel(req.body as { code?: string; label?: string; name?: string });
  if (!code || !description || !defaultPriorityId) {
    return res.status(400).json({ message: 'Code, description, and defaultPriorityId are required.' });
  }
  const parsedDefaultPriorityId = parseId(defaultPriorityId);
  if (!parsedDefaultPriorityId) return res.status(400).json({ message: 'Default priority not found.' });
  const existing = await prisma.ticketType.findFirst({ where: { code } });
  if (existing) return res.status(400).json({ message: 'Ticket type code already exists.' });
  const ticketType = await prisma.ticketType.create({
    data: { name: code, code, label: label ?? toLabel(code), description: description.trim(), defaultPriorityId: parsedDefaultPriorityId }
  });
  res.status(201).json(ticketType);
}

export async function updateTicketType(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) return res.status(400).json({ message: 'Invalid ticket type id.' });
  const { description, defaultPriorityId } = req.body as { description?: string; defaultPriorityId?: number };
  const { code, label } = pickCodeAndLabel(req.body as { code?: string; label?: string; name?: string });
  if (!code && !description && !defaultPriorityId && typeof label === 'undefined') {
    return res.status(400).json({ message: 'Provide code, label, description, or defaultPriorityId to update.' });
  }
  if (code) {
    const duplicate = await prisma.ticketType.findFirst({ where: { code, NOT: { id: parsedId } } });
    if (duplicate) return res.status(400).json({ message: 'Ticket type code already exists.' });
  }
  const parsedDefaultPriorityId = parseOptionalId(defaultPriorityId);
  const ticketType = await prisma.ticketType.update({
    where: { id: parsedId },
    data: {
      code,
      name: code,
      label: typeof label === 'undefined' ? undefined : label,
      description: description?.trim(),
      defaultPriorityId: parsedDefaultPriorityId
    }
  });
  res.json(ticketType);
}

export async function deleteTicketType(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) return res.status(400).json({ message: 'Invalid ticket type id.' });
  await prisma.ticketType.delete({ where: { id: parsedId } });
  res.status(204).send();
}
