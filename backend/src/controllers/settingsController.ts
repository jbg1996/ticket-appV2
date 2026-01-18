import { Request, Response } from 'express';
import prisma from '../prisma/client.js';

export async function getHeaderColor(_req: Request, res: Response) {
  const setting = await prisma.setting.findUnique({ where: { key: 'HEADER_COLOR' } });
  res.json({ value: setting?.value ?? '#1f2937' });
}

export async function updateHeaderColor(req: Request, res: Response) {
  const { value } = req.body as { value: string };
  const setting = await prisma.setting.upsert({
    where: { key: 'HEADER_COLOR' },
    update: { value },
    create: { key: 'HEADER_COLOR', value }
  });
  res.json(setting);
}
