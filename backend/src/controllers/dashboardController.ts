import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { getDashboardSummary } from '../services/dashboardService.js';

const dashboardQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  granularity: z.enum(['day', 'week']).optional()
});

const dayInMs = 24 * 60 * 60 * 1000;

const errorResponse = (res: Response, status: number, message: string, code: string) =>
  res.status(status).json({
    ok: false,
    error: {
      message,
      code
    }
  });

export async function getDashboardSummaryHandler(req: AuthRequest, res: Response) {
  const parsed = dashboardQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return errorResponse(res, 400, 'Invalid dashboard filters.', 'VALIDATION_ERROR');
  }

  const now = new Date();
  const end = parsed.data.end ? new Date(parsed.data.end) : now;
  const start = parsed.data.start ? new Date(parsed.data.start) : new Date(end.getTime() - 30 * dayInMs);
  const granularity = parsed.data.granularity ?? 'day';

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return errorResponse(res, 400, 'Invalid date values.', 'INVALID_DATE');
  }

  if (start.getTime() > end.getTime()) {
    return errorResponse(res, 400, 'Start date must be before end date.', 'INVALID_RANGE');
  }

  try {
    const data = await getDashboardSummary({ start, end, granularity });
    return res.status(200).json({
      ok: true,
      data
    });
  } catch (error) {
    console.error('Dashboard summary error', error);
    return errorResponse(res, 500, 'Unable to generate dashboard summary.', 'DASHBOARD_ERROR');
  }
}
