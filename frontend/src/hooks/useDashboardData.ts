import { useEffect, useState } from 'react';
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

export function useDashboardData(params: { start: string; end: string; granularity: DashboardGranularity }) {
  const { start, end, granularity } = params;
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setData(response.data);
      } catch (requestError) {
        if ((requestError as Error).name === 'AbortError') {
          return;
        }
        setData(null);
        setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    return () => controller.abort();
  }, [start, end, granularity]);

  return { data, loading, error };
}
