import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client.js';

const DEFAULT_HEADER_COLOR = '#1f2937';
const DEFAULT_SIDEBAR_COLOR = '#0f172a';
const DEFAULT_APP_LOGO_URL = 'https://res.cloudinary.com/dcjouquja/image/upload/v1771182335/Logo_TiMapp.png';
const DEFAULT_COMPANY_LOGO_URL = 'https://res.cloudinary.com/dcjouquja/image/upload/v1771182565/Logo_Icono_TiMapp.png';

const colorSchema = z.string().trim().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, 'Color must be a valid hex code.');
const urlSchema = z.string().trim().url('Logo URL must be a valid URL.');

const updateSettingsSchema = z.object({
  headerColor: colorSchema.optional(),
  sidebarColor: colorSchema.optional(),
  appLogoUrl: urlSchema.nullable().optional(),
  companyLogoUrl: urlSchema.nullable().optional(),
  value: colorSchema.optional()
});

export async function getAppSettings(_req: Request, res: Response) {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['HEADER_COLOR', 'SIDEBAR_COLOR', 'APP_LOGO_URL', 'COMPANY_LOGO_URL'] } }
  });

  const byKey = new Map(settings.map((setting) => [setting.key, setting.value]));
  const headerColor = byKey.get('HEADER_COLOR') ?? DEFAULT_HEADER_COLOR;
  const sidebarColor = byKey.get('SIDEBAR_COLOR') ?? headerColor ?? DEFAULT_SIDEBAR_COLOR;
  const appLogoUrl = byKey.get('APP_LOGO_URL') || DEFAULT_APP_LOGO_URL;
  const companyLogoUrl = byKey.get('COMPANY_LOGO_URL') || DEFAULT_COMPANY_LOGO_URL;

  res.json({ headerColor, sidebarColor, appLogoUrl, companyLogoUrl });
}

export async function updateAppSettings(req: Request, res: Response) {
  const { headerColor, sidebarColor, appLogoUrl, companyLogoUrl, value } = updateSettingsSchema.parse(req.body);
  const normalizedHeaderColor = headerColor ?? value;

  if (!normalizedHeaderColor && !sidebarColor && appLogoUrl === undefined && companyLogoUrl === undefined) {
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

  if (appLogoUrl !== undefined) {
    operations.push(
      prisma.setting.upsert({
        where: { key: 'APP_LOGO_URL' },
        update: { value: appLogoUrl || '' },
        create: { key: 'APP_LOGO_URL', value: appLogoUrl || '' }
      })
    );
  }

  if (companyLogoUrl !== undefined) {
    operations.push(
      prisma.setting.upsert({
        where: { key: 'COMPANY_LOGO_URL' },
        update: { value: companyLogoUrl || '' },
        create: { key: 'COMPANY_LOGO_URL', value: companyLogoUrl || '' }
      })
    );
  }

  await prisma.$transaction(operations);

  return getAppSettings(req, res);
}
