import { Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import prisma from '../prisma/client.js';
import { AuthRequest } from '../middleware/auth.js';
import { addHistory } from '../services/historyService.js';
import { env } from '../config/env.js';
import { parseId } from '../utils/parseId.js';

export async function uploadAttachment(req: AuthRequest, res: Response) {
  if (!req.user || !req.file) {
    return res.status(400).json({ message: 'Missing attachment.' });
  }
  const parsedId = parseId(req.params.id);
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
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid attachment id.' });
  }
  const attachment = await prisma.attachment.findUnique({ where: { id: parsedId }, include: { ticket: true } });
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

export async function deleteAttachment(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  if (req.user.role !== 'ADMIN' && req.user.role !== 'TECH') {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  const parsedTicketId = parseId(req.params.ticketId);
  if (!parsedTicketId) {
    return res.status(400).json({ message: 'Invalid ticket id.' });
  }
  const parsedAttachmentId = parseId(req.params.attachmentId);
  if (!parsedAttachmentId) {
    return res.status(400).json({ message: 'Invalid attachment id.' });
  }
  const attachment = await prisma.attachment.findUnique({ where: { id: parsedAttachmentId } });
  if (!attachment || attachment.ticketId !== parsedTicketId) {
    return res.status(404).json({ message: 'Attachment not found.' });
  }
  const absolutePath = path.resolve(attachment.storagePath);
  if (!absolutePath.includes(path.resolve(env.uploadDir))) {
    return res.status(400).json({ message: 'Invalid attachment path.' });
  }

  await prisma.attachment.delete({ where: { id: parsedAttachmentId } });
  await addHistory({
    ticketId: parsedTicketId,
    actorId: req.user.id,
    eventType: 'ATTACHMENT_DELETED',
    message: attachment.originalName
  });

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return res.status(200).json({ ok: true });
}
