import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client.js';
import { env } from '../config/env.js';

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function sanitizeFileSegment(value: string) {
  const sanitized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return sanitized || 'unknown';
}

function buildCompactTimestamp(date: Date) {
  const isoDigits = date.toISOString().replace(/\D/g, '');
  return isoDigits.slice(0, 17);
}

function buildUniqueReportFileName(label: string, date: Date) {
  const filterSegment = sanitizeFileSegment(label);
  const timestamp = buildCompactTimestamp(date);
  const uuid = randomUUID();
  return `report-${filterSegment}-${timestamp}-${uuid}.xlsx`;
}


const statusLabelMap: Record<string, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
};

const priorityLabelMap: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

const typeLabelMap: Record<string, string> = {
  REQUEST: 'Request',
  INCIDENT: 'Incident',
  ACCESS: 'Access',
  HARDWARE: 'Hardware',
  SOFTWARE: 'Software',
  OTHER: 'Other'
};

const titleCase = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const formatLabel = (labels: Record<string, string>, value: string) => labels[value] ?? titleCase(value);

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
      priority: { select: { name: true } },
      status: { select: { name: true } },
      ticketType: { select: { name: true } }
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
      type: formatLabel(typeLabelMap, ticket.ticketType.name),
      title: ticket.title,
      description: ticket.description,
      status: formatLabel(statusLabelMap, ticket.status.name),
      priority: formatLabel(priorityLabelMap, ticket.priority.name),
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
  const resolvedFileName = fileName ?? buildUniqueReportFileName(label, now);
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
