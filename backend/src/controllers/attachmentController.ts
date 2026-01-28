import { Response } from 'express';
import path from 'path';
import prisma from '../prisma/client.js';
import { AuthRequest } from '../middleware/auth.js';
import { addHistory } from '../services/historyService.js';
import { env } from '../config/env.js';

function parseTicketId(id: string): number | null {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function uploadAttachment(req: AuthRequest, res: Response) {
  if (!req.user || !req.file) {
    return res.status(400).json({ message: 'Missing attachment.' });
  }
  const parsedId = parseTicketId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid ticket id.' });
  }
  const attachment = await prisma.attachment.create({
    data: {
      ticketId: parsedId,
      uploaderId: req.user.id,
      originalName: req.file.originalname,
      storagePath: req.file.path,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size
    }
  });
  await addHistory({
    ticketId: parsedId,
    actorId: req.user.id,
    eventType: 'ATTACHMENT_ADDED',
    message: attachment.originalName
  });
  res.status(201).json(attachment);
}

export async function downloadAttachment(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const { id } = req.params;
  const attachment = await prisma.attachment.findUnique({ where: { id }, include: { ticket: true } });
  if (!attachment) {
    return res.status(404).json({ message: 'Attachment not found.' });
  }
  const ticket = attachment.ticket;
  const isAllowed = ticket.createdById === req.user.id || ticket.assignedToId === req.user.id || req.user.role === 'ADMIN';
  if (!isAllowed) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  const absolutePath = path.resolve(attachment.storagePath);
  if (!absolutePath.includes(path.resolve(env.uploadDir))) {
    return res.status(400).json({ message: 'Invalid attachment path.' });
  }
  res.download(absolutePath, attachment.originalName);
}
