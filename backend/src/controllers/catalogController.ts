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
  const status = await prisma.status.create({ data: req.body });
  res.status(201).json(status);
}

export async function updateStatus(req: Request, res: Response) {
  const { id } = req.params;
  const status = await prisma.status.update({ where: { id }, data: req.body });
  res.json(status);
}

export async function deleteStatus(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.status.delete({ where: { id } });
  res.status(204).send();
}

export async function listPriorities(_req: Request, res: Response) {
  const items = await prisma.priority.findMany();
  res.json(items);
}

export async function createPriority(req: Request, res: Response) {
  const priority = await prisma.priority.create({ data: req.body });
  res.status(201).json(priority);
}

export async function updatePriority(req: Request, res: Response) {
  const { id } = req.params;
  const priority = await prisma.priority.update({ where: { id }, data: req.body });
  res.json(priority);
}

export async function deletePriority(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.priority.delete({ where: { id } });
  res.status(204).send();
}

export async function listTicketTypes(_req: Request, res: Response) {
  const items = await prisma.ticketType.findMany({ include: { defaultPriority: true } });
  res.json(items);
}

export async function createTicketType(req: Request, res: Response) {
  const ticketType = await prisma.ticketType.create({ data: req.body });
  res.status(201).json(ticketType);
}

export async function updateTicketType(req: Request, res: Response) {
  const { id } = req.params;
  const ticketType = await prisma.ticketType.update({ where: { id }, data: req.body });
  res.json(ticketType);
}

export async function deleteTicketType(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.ticketType.delete({ where: { id } });
  res.status(204).send();
}
