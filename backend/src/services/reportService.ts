import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs/promises';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client.js';
import { env } from '../config/env.js';

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}


const formatCatalogLabel = (code: string, label?: string | null) => {
  if (label && label.trim()) return label;
  return code
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
};

type ReportPreset = 'DAILY' | 'WEEKLY' | 'MONTHLY';

type GenerateReportParams =
  | {
      label: string;
      where: Prisma.TicketWhereInput;
      orderBy?: Prisma.TicketOrderByWithRelationInput | Prisma.TicketOrderByWithRelationInput[];
      rangeStart?: Date;
      rangeEnd?: Date;
      fileName?: string;
      preset?: ReportPreset;
    }
  | {
      preset: ReportPreset;
      rangeStart: Date;
      rangeEnd: Date;
      orderBy?: Prisma.TicketOrderByWithRelationInput | Prisma.TicketOrderByWithRelationInput[];
      fileName?: string;
      label?: string;
      where?: Prisma.TicketWhereInput;
    };

type GeneratedReport = {
  fileName: string;
  filePath: string;
  mimeType: string;
  ticketCount: number;
  rangeStart: Date;
  rangeEnd: Date;
};

export async function generateReport(params: GenerateReportParams): Promise<GeneratedReport> {
  let label = 'label' in params ? params.label : params.label;
  let where = 'where' in params ? params.where : params.where;
  const orderBy = params.orderBy;
  const rangeStart = params.rangeStart;
  const rangeEnd = params.rangeEnd;
  const fileName = params.fileName;
  if (!label || !where) {
    if ('preset' in params && params.preset) {
      label = params.preset.toLowerCase();
      where = {
        createdAt: {
          gte: params.rangeStart,
          lte: params.rangeEnd
        }
      };
    }
  }
  const now = new Date();
  const workbook = new ExcelJS.Workbook();
  const detailSheet = workbook.addWorksheet('Details');

  if (!label || !where) {
    throw new Error('Missing report parameters.');
  }

  const tickets = await prisma.ticket.findMany({
    where,
    select: {
      createdAt: true,
      description: true,
      title: true,
      priority: { select: { code: true, label: true } },
      status: { select: { code: true, label: true } },
      ticketType: { select: { code: true, label: true } }
    },
    orderBy: orderBy ?? { createdAt: 'desc' }
  });

  detailSheet.columns = [
    { header: 'Type', key: 'type' },
    { header: 'Title', key: 'title' },
    { header: 'Description', key: 'description' },
    { header: 'Status', key: 'status' },
    { header: 'Priority', key: 'priority' },
    { header: 'Created At', key: 'createdAt' }
  ];
  tickets.forEach((ticket) => {
    detailSheet.addRow({
      type: formatCatalogLabel(ticket.ticketType.code, ticket.ticketType.label),
      title: ticket.title,
      description: ticket.description,
      status: formatCatalogLabel(ticket.status.code, ticket.status.label),
      priority: formatCatalogLabel(ticket.priority.code, ticket.priority.label),
      createdAt: ticket.createdAt
    });
  });

  let resolvedRangeStart = rangeStart;
  let resolvedRangeEnd = rangeEnd;
  if (!resolvedRangeStart || !resolvedRangeEnd) {
    if (tickets.length > 0) {
      const timestamps = tickets.map((ticket) => ticket.createdAt.getTime());
      resolvedRangeStart = new Date(Math.min(...timestamps));
      resolvedRangeEnd = new Date(Math.max(...timestamps));
    } else {
      resolvedRangeStart = resolvedRangeStart ?? now;
      resolvedRangeEnd = resolvedRangeEnd ?? now;
    }
  }

  await ensureDir(env.reportDir);
  const resolvedFileName = fileName ?? `report-${label}-${now.toISOString().split('T')[0]}.xlsx`;
  const filePath = path.join(env.reportDir, resolvedFileName);
  await workbook.xlsx.writeFile(filePath);

  return {
    fileName: resolvedFileName,
    filePath,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ticketCount: tickets.length,
    rangeStart: resolvedRangeStart,
    rangeEnd: resolvedRangeEnd
  };
}
