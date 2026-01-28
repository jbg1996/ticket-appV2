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
  createdById?: string;
};

export async function generateReport({ preset, rangeStart, rangeEnd, createdById }: GenerateReportParams) {
  const now = new Date();
  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Summary');
  const detailSheet = workbook.addWorksheet('Details');

  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: {
        gte: rangeStart,
        lte: rangeEnd
      }
    },
    include: { status: true, priority: true, ticketType: true, createdBy: true, assignedTo: true }
  });

  const statusCounts = tickets.reduce<Record<string, number>>((acc, ticket) => {
    acc[ticket.status.name] = (acc[ticket.status.name] ?? 0) + 1;
    return acc;
  }, {});
  const priorityCounts = tickets.reduce<Record<string, number>>((acc, ticket) => {
    acc[ticket.priority.name] = (acc[ticket.priority.name] ?? 0) + 1;
    return acc;
  }, {});
  const typeCounts = tickets.reduce<Record<string, number>>((acc, ticket) => {
    acc[ticket.ticketType.name] = (acc[ticket.ticketType.name] ?? 0) + 1;
    return acc;
  }, {});
  const resolutionTimes = tickets
    .filter((ticket) => ticket.resolvedAt)
    .map((ticket) => (ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60));
  const avgResolution = resolutionTimes.length
    ? resolutionTimes.reduce((acc, value) => acc + value, 0) / resolutionTimes.length
    : 0;

  summarySheet.addRow(['Metric', 'Value']);
  Object.entries(statusCounts).forEach(([key, value]) => summarySheet.addRow([`Status: ${key}`, value]));
  Object.entries(priorityCounts).forEach(([key, value]) => summarySheet.addRow([`Priority: ${key}`, value]));
  Object.entries(typeCounts).forEach(([key, value]) => summarySheet.addRow([`Type: ${key}`, value]));
  summarySheet.addRow(['Avg Resolution Hours', avgResolution.toFixed(2)]);

  detailSheet.addRow([
    'ID',
    'Created At',
    'Updated At',
    'Status',
    'Priority',
    'Type',
    'Creator',
    'Assignee',
    'Title',
    'Resolution Hours'
  ]);
  tickets.forEach((ticket) => {
    const resolutionHours = ticket.resolvedAt
      ? (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)
      : null;
    detailSheet.addRow([
      ticket.id,
      ticket.createdAt,
      ticket.updatedAt,
      ticket.status.name,
      ticket.priority.name,
      ticket.ticketType.name,
      `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}`,
      ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned',
      ticket.title,
      resolutionHours ? resolutionHours.toFixed(2) : 'N/A'
    ]);
  });

  await ensureDir(env.reportDir);
  const filename = `report-${preset.toLowerCase()}-${now.toISOString().split('T')[0]}.xlsx`;
  const filePath = path.join(env.reportDir, filename);
  await workbook.xlsx.writeFile(filePath);

  const report = await prisma.report.create({
    data: {
      fileName: filename,
      preset,
      rangeStart,
      rangeEnd,
      filePath,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      createdById: createdById ?? null
    }
  });

  return report;
}
