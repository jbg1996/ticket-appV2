import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs/promises';
import prisma from '../prisma/client.js';
import { env } from '../config/env.js';

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

type ReportPreset = 'TODAY' | 'THIS_MONTH' | 'YTD' | 'CUSTOM' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

type GenerateReportParams = {
  preset: ReportPreset;
  rangeStart: Date;
  rangeEnd: Date;
  fileName?: string;
};

type GeneratedReport = {
  fileName: string;
  filePath: string;
  mimeType: string;
  ticketCount: number;
};

export async function generateReport({
  preset,
  rangeStart,
  rangeEnd,
  fileName
}: GenerateReportParams): Promise<GeneratedReport> {
  const now = new Date();
  const workbook = new ExcelJS.Workbook();
  const detailSheet = workbook.addWorksheet('Details');

  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: {
        gte: rangeStart,
        lte: rangeEnd
      }
    },
    select: {
      createdAt: true,
      description: true,
      title: true,
      priority: { select: { name: true } },
      status: { select: { name: true } },
      ticketType: { select: { name: true } }
    }
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
      type: ticket.ticketType.name,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status.name,
      priority: ticket.priority.name,
      createdAt: ticket.createdAt
    });
  });

  await ensureDir(env.reportDir);
  const resolvedFileName = fileName ?? `report-${preset.toLowerCase()}-${now.toISOString().split('T')[0]}.xlsx`;
  const filePath = path.join(env.reportDir, resolvedFileName);
  await workbook.xlsx.writeFile(filePath);

  return {
    fileName: resolvedFileName,
    filePath,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ticketCount: tickets.length
  };
}
