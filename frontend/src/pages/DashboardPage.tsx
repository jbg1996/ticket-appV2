import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts';
import { ChartEmptyState } from '../components/dashboard/ChartEmptyState';
import { DashboardChartTooltip } from '../components/dashboard/DashboardChartTooltip';
import { useDashboardData, type DashboardGranularity } from '../hooks/useDashboardData';

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const formatShortDate = (bucket: string, granularity: DashboardGranularity) => {
  if (granularity === 'week') {
    return bucket;
  }
  const date = new Date(`${bucket}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return bucket;
  }
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short'
  }).format(date);
};

const formatFullDate = (bucket: string, granularity: DashboardGranularity) => {
  if (granularity === 'week') {
    return `Semana ${bucket}`;
  }
  const date = new Date(`${bucket}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return bucket;
  }
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  }).format(date);
};

const formatMttr = (hours: number, options?: { detailed?: boolean }) => {
  if (hours < 1) {
    const minutes = hours * 60;
    const decimals = options?.detailed ? 2 : minutes < 1 ? 2 : 1;
    return `${minutes.toFixed(decimals)} min`;
  }

  const decimals = options?.detailed ? 2 : 1;
  return `${hours.toFixed(decimals)} h`;
};

const hasValues = (values: number[]) => values.some((value) => value > 0);

export function DashboardPage() {
  const [start, setStart] = useState(() => toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [end, setEnd] = useState(() => toDateInputValue(new Date()));
  const [granularity, setGranularity] = useState<DashboardGranularity>('day');

  const { data, loading, error, retry } = useDashboardData({ start, end, granularity });

  const workloadTopTen = useMemo(() => data.workloadByTech.slice(0, 10), [data.workloadByTech]);

  const mttrYAxisDomain = useMemo<[number, number]>(() => {
    const values = data.mttrSeries.map((point) => point.mttrHours).filter((value) => Number.isFinite(value));
    const max = Math.max(...values, 0);
    if (max <= 1) {
      return [0, Number((max + 0.25).toFixed(2))];
    }
    return [0, Number((max * 1.15).toFixed(2))];
  }, [data.mttrSeries]);

  const hasCreatedResolvedData = hasValues(
    data.createdVsResolvedSeries.flatMap((point) => [point.createdCount, point.resolvedCount])
  );
  const hasStatusData = hasValues(data.statusDistribution.map((point) => point.count));
  const hasBacklogAgingData = hasValues(data.backlogAging.map((point) => point.count));
  const hasWorkloadData = hasValues(
    workloadTopTen.flatMap((point) => [point.openAssignedCount, point.resolvedInRangeCount])
  );
  const hasMttrData = hasValues(data.mttrSeries.map((point) => point.mttrHours));

  return (
    <div className="page dashboard-page">
      <div className="card dashboard-filters">
        <h2>Dashboard</h2>
        <div className="dashboard-filters__controls">
          <label>
            Desde
            <input type="date" value={start} onChange={(event) => setStart(event.target.value)} max={end} />
          </label>
          <label>
            Hasta
            <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} min={start} />
          </label>
          <label>
            Granularidad
            <select
              value={granularity}
              onChange={(event) => setGranularity(event.target.value as DashboardGranularity)}
            >
              <option value="day">Día</option>
              <option value="week">Semana</option>
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="card dashboard-error-card">
          <p className="text-error">{error}</p>
          <button type="button" onClick={retry}>
            Reintentar
          </button>
        </div>
      )}

      <div className="grid dashboard-kpis">
        <div className="card dashboard-kpi">
          <p>Tickets creados</p>
          <strong>{data.kpis.totalCreated}</strong>
        </div>
        <div className="card dashboard-kpi">
          <p>Tickets resueltos</p>
          <strong>{data.kpis.totalResolved}</strong>
        </div>
        <div className="card dashboard-kpi">
          <p>Backlog abierto</p>
          <strong>{data.kpis.openBacklog}</strong>
        </div>
        <div className="card dashboard-kpi">
          <p>MTTR</p>
          <strong>{formatMttr(data.kpis.mttrHours)}</strong>
        </div>
      </div>

      {loading && <div className="card">Cargando dashboard...</div>}

      <div className="grid dashboard-charts">
        <section className="card dashboard-chart">
          <h3>Tickets creados vs resueltos</h3>
          {!hasCreatedResolvedData ? (
            <ChartEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.createdVsResolvedSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  type="category"
                  tickFormatter={(value: string | number) => formatShortDate(String(value), granularity)}
                />
                <YAxis />
                <Tooltip
                  content={
                    <DashboardChartTooltip
                      titleFormatter={(label: string) => formatFullDate(label, granularity)}
                      valueFormatter={(value: unknown, name: string) => `${name}: ${value}`}
                    />
                  }
                />
                <Legend />
                <Area type="monotone" dataKey="createdCount" name="Creados" stroke="#2563eb" fill="#93c5fd" />
                <Area type="monotone" dataKey="resolvedCount" name="Resueltos" stroke="#16a34a" fill="#86efac" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="card dashboard-chart">
          <h3>Distribución por estado</h3>
          {!hasStatusData ? (
            <ChartEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.statusDistribution} dataKey="count" nameKey="statusName" outerRadius={90} label>
                  {data.statusDistribution.map((entry) => (
                    <Cell key={entry.statusId} fill={entry.color || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <DashboardChartTooltip
                      valueFormatter={(value: unknown, name: string) => `${name}: ${value}`}
                    />
                  }
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="card dashboard-chart">
          <h3>Backlog ageing</h3>
          {!hasBacklogAgingData ? (
            <ChartEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.backlogAging}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" type="category" />
                <YAxis />
                <Tooltip
                  content={<DashboardChartTooltip valueFormatter={(value: unknown, name: string) => `${name}: ${value}`} />}
                />
                <Bar dataKey="count" name="Tickets" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="card dashboard-chart">
          <h3>
            Carga por técnico {data.workloadByTech.length > 10 ? <small className="dashboard-note">Top 10</small> : null}
          </h3>
          {!hasWorkloadData ? (
            <ChartEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart layout="vertical" data={workloadTopTen}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="fullName" width={120} />
                <Tooltip
                  content={
                    <DashboardChartTooltip
                      valueFormatter={(value: unknown, name: string) => `${name}: ${value}`}
                    />
                  }
                />
                <Legend />
                <Bar dataKey="openAssignedCount" name="Abiertos" fill="#3b82f6" />
                <Bar dataKey="resolvedInRangeCount" name="Resueltos en rango" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="card dashboard-chart dashboard-chart--full">
          <h3>Tendencia MTTR</h3>
          {!hasMttrData ? (
            <ChartEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.mttrSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  type="category"
                  tickFormatter={(value: string | number) => formatShortDate(String(value), granularity)}
                />
                <YAxis domain={mttrYAxisDomain} />
                <Tooltip
                  content={
                    <DashboardChartTooltip
                      titleFormatter={(label: string) => formatFullDate(label, granularity)}
                      valueFormatter={(value: unknown) => `MTTR: ${formatMttr(Number(value), { detailed: true })}`}
                    />
                  }
                />
                <Line type="monotone" dataKey="mttrHours" name="MTTR" stroke="#7c3aed" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
    </div>
  );
}
