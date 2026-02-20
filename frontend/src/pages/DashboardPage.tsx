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
import { useDashboardData, type DashboardGranularity } from '../hooks/useDashboardData';

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const formatBucketLabel = (bucket: string, granularity: DashboardGranularity) => {
  if (granularity === 'week') {
    return bucket;
  }
  const date = new Date(`${bucket}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return bucket;
  }
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit'
  }).format(date);
};

export function DashboardPage() {
  const [start, setStart] = useState(() => toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [end, setEnd] = useState(() => toDateInputValue(new Date()));
  const [granularity, setGranularity] = useState<DashboardGranularity>('day');

  const { data, loading, error } = useDashboardData({ start, end, granularity });

  const createdVsResolvedData = useMemo(
    () =>
      (data?.createdVsResolvedSeries ?? []).map((point) => ({
        ...point,
        label: formatBucketLabel(point.date, granularity)
      })),
    [data?.createdVsResolvedSeries, granularity]
  );

  const mttrSeriesData = useMemo(
    () =>
      (data?.mttrSeries ?? []).map((point) => ({
        ...point,
        label: formatBucketLabel(point.date, granularity)
      })),
    [data?.mttrSeries, granularity]
  );

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

      {error && <div className="card text-error">{error}</div>}

      <div className="grid dashboard-kpis">
        <div className="card dashboard-kpi">
          <p>Tickets creados</p>
          <strong>{data?.kpis.totalCreated ?? 0}</strong>
        </div>
        <div className="card dashboard-kpi">
          <p>Tickets resueltos</p>
          <strong>{data?.kpis.totalResolved ?? 0}</strong>
        </div>
        <div className="card dashboard-kpi">
          <p>Backlog abierto</p>
          <strong>{data?.kpis.openBacklog ?? 0}</strong>
        </div>
        <div className="card dashboard-kpi">
          <p>MTTR (h)</p>
          <strong>{data?.kpis.mttrHours ?? 0}</strong>
        </div>
      </div>

      {loading && <div className="card">Cargando dashboard...</div>}

      <div className="grid dashboard-charts">
        <section className="card dashboard-chart">
          <h3>Tickets creados vs resueltos</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={createdVsResolvedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="createdCount" name="Creados" stroke="#2563eb" fill="#93c5fd" />
              <Area type="monotone" dataKey="resolvedCount" name="Resueltos" stroke="#16a34a" fill="#86efac" />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="card dashboard-chart">
          <h3>Distribución por estado</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data?.statusDistribution ?? []} dataKey="count" nameKey="statusName" outerRadius={90} label>
                {(data?.statusDistribution ?? []).map((entry) => (
                  <Cell key={entry.statusId} fill={entry.color || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="card dashboard-chart">
          <h3>Backlog ageing</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.backlogAging ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" name="Tickets" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="card dashboard-chart">
          <h3>Carga por técnico</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart layout="vertical" data={data?.workloadByTech ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="fullName" width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="openAssignedCount" name="Abiertos" fill="#3b82f6" />
              <Bar dataKey="resolvedInRangeCount" name="Resueltos en rango" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="card dashboard-chart dashboard-chart--full">
          <h3>Tendencia MTTR</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={mttrSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="mttrHours" name="MTTR (h)" stroke="#7c3aed" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>
    </div>
  );
}
