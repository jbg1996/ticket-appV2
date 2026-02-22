import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';

export type DashboardGranularity = 'day' | 'week';

export type DashboardSummary = {
  kpis: {
    totalCreated: number;
    totalResolved: number;
    openBacklog: number;
    mttrHours: number;
  };
  createdVsResolvedSeries: Array<{ date: string; createdCount: number; resolvedCount: number }>;
  statusDistribution: Array<{ statusId: number; statusName: string; count: number; color: string }>;
  backlogAging: Array<{ bucket: string; count: number }>;
  workloadByTech: Array<{ userId: number; fullName: string; openAssignedCount: number; resolvedInRangeCount: number }>;
  mttrSeries: Array<{ date: string; mttrHours: number }>;
};

type DashboardApiResponse = {
  ok: true;
  data: DashboardSummary;
};

const toIsoStart = (value: string) => new Date(`${value}T00:00:00.000Z`).toISOString();
const toIsoEnd = (value: string) => new Date(`${value}T23:59:59.999Z`).toISOString();

const toFiniteNumber = (value: unknown) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeSummary = (summary: DashboardSummary): DashboardSummary => ({
  ...summary,
  kpis: {
    totalCreated: toFiniteNumber(summary.kpis?.totalCreated),
    totalResolved: toFiniteNumber(summary.kpis?.totalResolved),
    openBacklog: toFiniteNumber(summary.kpis?.openBacklog),
    mttrHours: toFiniteNumber(summary.kpis?.mttrHours)
  },
  createdVsResolvedSeries: (summary.createdVsResolvedSeries ?? []).map((point) => ({
    date: String(point.date ?? ''),
    createdCount: toFiniteNumber(point.createdCount),
    resolvedCount: toFiniteNumber(point.resolvedCount)
  })),
  statusDistribution: summary.statusDistribution ?? [],
  backlogAging: summary.backlogAging ?? [],
  workloadByTech: summary.workloadByTech ?? [],
  mttrSeries: (summary.mttrSeries ?? []).map((point) => ({
    date: String(point.date ?? ''),
    mttrHours: toFiniteNumber(point.mttrHours)
  }))
});

const emptySummary: DashboardSummary = {
  kpis: {
    totalCreated: 0,
    totalResolved: 0,
    openBacklog: 0,
    mttrHours: 0
  },
  createdVsResolvedSeries: [],
  statusDistribution: [],
  backlogAging: [],
  workloadByTech: [],
  mttrSeries: []
};

export function useDashboardData(params: { start: string; end: string; granularity: DashboardGranularity }) {
  const { start, end, granularity } = params;
  const [data, setData] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams({
          start: toIsoStart(start),
          end: toIsoEnd(end),
          granularity
        });
        const response = await apiFetch<DashboardApiResponse>(`/api/dashboard/summary?${searchParams.toString()}`, {
          signal: controller.signal,
          cache: 'no-store'
        });
        setData(normalizeSummary(response.data));
      } catch (requestError) {
        if ((requestError as Error).name === 'AbortError') {
          return;
        }
        setData(emptySummary);
        setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    return () => controller.abort();
  }, [start, end, granularity, reloadToken]);

  const empty = useMemo(() => {
    const hasMainSeriesData =
      data.createdVsResolvedSeries.some((point) => point.createdCount > 0 || point.resolvedCount > 0) ||
      data.statusDistribution.some((point) => point.count > 0) ||
      data.backlogAging.some((point) => point.count > 0) ||
      data.workloadByTech.some((point) => point.openAssignedCount > 0 || point.resolvedInRangeCount > 0) ||
      data.mttrSeries.some((point) => point.mttrHours > 0);

    return !hasMainSeriesData;
  }, [data]);

  return { data, loading, error, retry, empty };
}
