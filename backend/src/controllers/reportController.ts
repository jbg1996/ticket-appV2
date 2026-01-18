import { Request, Response } from 'express';
import prisma from '../prisma/client.js';
import { generateReport } from '../services/reportService.js';

export async function generateReportHandler(req: Request, res: Response) {
  const period = (req.query.period as string)?.toUpperCase();
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(period)) {
    return res.status(400).json({ message: 'Invalid period.' });
  }
  const report = await generateReport(period as 'DAILY' | 'WEEKLY' | 'MONTHLY');
  res.status(201).json(report);
}

export async function listReports(_req: Request, res: Response) {
  const reports = await prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(reports);
}

export async function downloadReport(req: Request, res: Response) {
  const { id } = req.params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return res.status(404).json({ message: 'Report not found.' });
  }
  res.download(report.filePath, report.name);
}
