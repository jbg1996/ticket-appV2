import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client.js';

const defaultHeaderColor = '#1f2937';
const defaultSidebarColor = '#0f172a';

const colorSchema = z.string().trim().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, 'Color must be a valid hex code.');

const updateSettingsSchema = z.object({
  headerColor: colorSchema.optional(),
  sidebarColor: colorSchema.optional(),
  value: colorSchema.optional()
});

export async function getAppSettings(_req: Request, res: Response) {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['HEADER_COLOR', 'SIDEBAR_COLOR'] } }
  });

  const byKey = new Map(settings.map((setting) => [setting.key, setting.value]));
  const headerColor = byKey.get('HEADER_COLOR') ?? defaultHeaderColor;
  const sidebarColor = byKey.get('SIDEBAR_COLOR') ?? headerColor ?? defaultSidebarColor;

  res.json({ headerColor, sidebarColor });
}

export async function updateAppSettings(req: Request, res: Response) {
  const { headerColor, sidebarColor, value } = updateSettingsSchema.parse(req.body);
  const normalizedHeaderColor = headerColor ?? value;

  if (!normalizedHeaderColor && !sidebarColor) {
    return res.status(400).json({ message: 'At least one setting is required.' });
  }

  const operations = [];
  if (normalizedHeaderColor) {
    operations.push(
      prisma.setting.upsert({
        where: { key: 'HEADER_COLOR' },
        update: { value: normalizedHeaderColor },
        create: { key: 'HEADER_COLOR', value: normalizedHeaderColor }
      })
    );
  }

  if (sidebarColor) {
    operations.push(
      prisma.setting.upsert({
        where: { key: 'SIDEBAR_COLOR' },
        update: { value: sidebarColor },
        create: { key: 'SIDEBAR_COLOR', value: sidebarColor }
      })
    );
  }

  await prisma.$transaction(operations);

  return getAppSettings(req, res);
}
