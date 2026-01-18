import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs/promises';
import prisma from '../prisma/client.js';
import { env } from '../config/env.js';

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function generateReport(periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY') {
  const now = new Date();
  const periodEnd = new Date(now);
  let periodStart = new Date(now);
  if (periodType === 'DAILY') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
  }
  if (periodType === 'WEEKLY') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0);
  }
  if (periodType === 'MONTHLY') {
    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    periodEnd.setDate(0);
    periodEnd.setHours(23, 59, 59, 999);
  }
  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Summary');
  const detailSheet = workbook.addWorksheet('Details');

  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: {
        gte: periodStart,
        lte: periodEnd
      }
    },
    include: { status: true, priority: true, ticketType: true, creator: true, assignee: true }
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
      `${ticket.creator.firstName} ${ticket.creator.lastName}`,
      ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : 'Unassigned',
      ticket.title,
      resolutionHours ? resolutionHours.toFixed(2) : 'N/A'
    ]);
  });

  await ensureDir(env.reportDir);
  const filename = `report-${periodType.toLowerCase()}-${now.toISOString().split('T')[0]}.xlsx`;
  const filePath = path.join(env.reportDir, filename);
  await workbook.xlsx.writeFile(filePath);

  const report = await prisma.report.create({
    data: {
      name: filename,
      periodType,
      filePath
    }
  });

  return report;
}
