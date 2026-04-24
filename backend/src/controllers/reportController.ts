import { Response } from 'express';
import fs from 'fs/promises';
import prisma from '../prisma/client.js';
import { generateReport } from '../services/reportService.js';
import { AuthRequest } from '../middleware/auth.js';
import { buildTicketQuery, parseTicketQuery } from '../utils/ticketQueryBuilder.js';
import { parseId } from '../utils/parseId.js';
import { buildTicketWhere, isTicketViewKey, isViewAllowedForRole } from '../constants/ticketViews.js';

type ReportPreset = 'TODAY' | 'THIS_MONTH' | 'YTD' | 'CUSTOM';

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function parseDateInput(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildPresetRange(preset: ReportPreset, startDate?: string, endDate?: string) {
  const now = new Date();
  if (preset === 'TODAY') {
    return { rangeStart: startOfDay(now), rangeEnd: endOfDay(now) };
  }
  if (preset === 'THIS_MONTH') {
    return { rangeStart: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), rangeEnd: endOfDay(now) };
  }
  if (preset === 'YTD') {
    return { rangeStart: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), rangeEnd: endOfDay(now) };
  }
  const parsedStart = startDate ? parseDateInput(startDate) : null;
  const parsedEnd = endDate ? parseDateInput(endDate) : null;
  if (!parsedStart || !parsedEnd) {
    return null;
  }
  const rangeStart = startOfDay(parsedStart);
  const rangeEnd = endOfDay(parsedEnd);
  if (rangeStart.getTime() > rangeEnd.getTime()) {
    return null;
  }
  return { rangeStart, rangeEnd };
}

export async function generateReportHandler(req: AuthRequest, res: Response) {
  const { preset, startDate, endDate, source, ticketQuery } = req.body as {
    preset?: ReportPreset;
    startDate?: string;
    endDate?: string;
    source?: string;
    ticketQuery?: unknown;
  };
  if (!req.user) {
    return res.status(401).json({ message: 'Missing authorization header.' });
  }
  if (source === 'tickets') {
    let parsedQuery;
    try {
      parsedQuery = parseTicketQuery(ticketQuery);
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid ticket query.' });
    }
    let baseWhere = undefined;
    if (parsedQuery.view) {
      if (!isTicketViewKey(parsedQuery.view)) {
        return res.status(400).json({ message: 'Invalid ticket view.' });
      }
      if (!isViewAllowedForRole(parsedQuery.view, req.user.role)) {
        return res.status(403).json({ message: 'Ticket view not allowed for this role.' });
      }
      baseWhere = buildTicketWhere(parsedQuery.view, req.user);
    }

    const { where, orderBy } = buildTicketQuery({ query: parsedQuery, baseWhere });
    const now = new Date();
    const pendingReport = await prisma.report.create({
      data: {
        preset: 'TICKETS',
        rangeStart: now,
        rangeEnd: now,
        createdById: req.user.id,
      }
    });
    console.info(`Report generation started`, { reportId: pendingReport.id, source: 'tickets' });
    try {
      const reportResult = await generateReport({
        label: 'tickets',
        where,
        orderBy
      });
      console.info(`Report generation ticket count`, { reportId: pendingReport.id, ticketCount: reportResult.ticketCount });
      const report = await prisma.report.update({
        where: { id: pendingReport.id },
        data: {
          fileName: reportResult.fileName,
          filePath: reportResult.filePath,
          mimeType: reportResult.mimeType,
          rangeStart: reportResult.rangeStart,
          rangeEnd: reportResult.rangeEnd,
          errorMessage: null
        }
      });
      return res.status(201).json(report);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Report generation failed`, { reportId: pendingReport.id, error });
      await prisma.report.update({
        where: { id: pendingReport.id },
        data: {
          errorMessage
        }
      });
      return res.status(500).json({ message: 'Report generation failed', error: errorMessage });
    }
  }

  if (!preset || !['TODAY', 'THIS_MONTH', 'YTD', 'CUSTOM'].includes(preset)) {
    return res.status(400).json({ message: 'Invalid preset.' });
  }
  const range = buildPresetRange(preset, startDate, endDate);
  if (!range) {
    return res.status(400).json({ message: 'Invalid date range.' });
  }
  const pendingReport = await prisma.report.create({
    data: {
      preset,
      rangeStart: range.rangeStart,
      rangeEnd: range.rangeEnd,
      createdById: req.user.id,
    }
  });
  console.info(`Report generation started`, { reportId: pendingReport.id });
  try {
    const reportResult = await generateReport({
      label: preset.toLowerCase(),
      rangeStart: range.rangeStart,
      rangeEnd: range.rangeEnd,
      where: {
        createdAt: {
          gte: range.rangeStart,
          lte: range.rangeEnd
        }
      }
    });
    console.info(`Report generation ticket count`, { reportId: pendingReport.id, ticketCount: reportResult.ticketCount });
    const report = await prisma.report.update({
      where: { id: pendingReport.id },
      data: {
        fileName: reportResult.fileName,
        filePath: reportResult.filePath,
        mimeType: reportResult.mimeType,
        errorMessage: null
      }
    });
    return res.status(201).json(report);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Report generation failed`, { reportId: pendingReport.id, error });
    await prisma.report.update({
      where: { id: pendingReport.id },
      data: {
        errorMessage
      }
    });
    return res.status(500).json({ message: 'Report generation failed', error: errorMessage });
  }
}

export async function listReports(_req: AuthRequest, res: Response) {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  });
  res.json(reports);
}

export async function downloadReport(req: AuthRequest, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid report id.' });
  }
  const report = await prisma.report.findUnique({ where: { id: parsedId } });
  if (!report) {
    return res.status(404).json({ message: 'Report not found.' });
  }
  const reportStatus = report.errorMessage ? 'FAILED' : report.filePath ? 'READY' : 'PENDING';
  console.info(`Report download requested`, { reportId: parsedId, status: reportStatus });
  if (reportStatus === 'PENDING') {
    return res.status(409).json({ message: 'Report is being generated', status: 'PENDING' });
  }
  if (reportStatus === 'FAILED') {
    return res.status(500).json({ message: 'Report generation failed', error: report.errorMessage });
  }
  if (!report.filePath || !report.fileName || !report.mimeType) {
    return res.status(500).json({ message: 'Report is not ready for download.' });
  }
  try {
    await fs.stat(report.filePath);
  } catch {
    return res.status(500).json({ message: 'Report file missing.' });
  }
  res.setHeader('Content-Type', report.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
  return res.sendFile(report.filePath, { root: process.cwd() });
}

export async function deleteReport(req: AuthRequest, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid report id.' });
  }
  const report = await prisma.report.findUnique({ where: { id: parsedId } });
  if (!report) {
    return res.status(404).json({ message: 'Report not found.' });
  }
  if (report.filePath) {
    try {
      await fs.unlink(report.filePath);
    } catch {
      // Ignore missing files
    }
  }
  await prisma.report.delete({ where: { id: parsedId } });
  return res.status(200).json({ message: 'Report deleted.' });
}
