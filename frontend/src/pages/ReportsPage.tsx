import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, apiFetchBlob } from '../services/api';
import { useAuth } from '../components/AuthProvider';

type Report = {
  id: string;
  fileName: string;
  createdAt: string;
  rangeStart: string;
  rangeEnd: string;
  createdBy?: { firstName: string; lastName: string } | null;
};

type PresetOption = 'TODAY' | 'THIS_MONTH' | 'YTD' | 'CUSTOM';

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [preset, setPreset] = useState<PresetOption>('TODAY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const loadReports = useCallback(() => {
    setError('');
    apiFetch<Report[]>('/api/reports')
      .then(setReports)
      .catch((err) => {
        setReports([]);
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los reportes.');
      });
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDownload = async (report: Report) => {
    const blob = await apiFetchBlob(`/api/reports/${report.id}/download`);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDelete = async (report: Report) => {
    if (!confirm('Delete this report?')) return;
    setError('');
    try {
      await apiFetch(`/api/reports/${report.id}`, { method: 'DELETE' });
      loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el reporte.');
    }
  };

  const canSubmit = useMemo(() => {
    if (preset !== 'CUSTOM') return true;
    return Boolean(startDate && endDate);
  }, [preset, startDate, endDate]);

  const handleGenerate = async () => {
    if (!isAdmin) return;
    setError('');
    if (preset === 'CUSTOM' && (!startDate || !endDate)) {
      setError('Selecciona fechas de inicio y fin.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          preset,
          startDate: preset === 'CUSTOM' ? startDate : undefined,
          endDate: preset === 'CUSTOM' ? endDate : undefined
        })
      });
      loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Reports</h2>
      <p className="page__subtitle">Generated reports ready for download.</p>
      {error ? <p className="form__error">{error}</p> : null}
      {isAdmin && (
        <div className="card">
          <h3>Generate report</h3>
          <div className="report-form">
            <div className="report-form__fields">
              <div className="form__row">
                <label className="form__label" htmlFor="preset">
                  Preset
                </label>
                <select id="preset" value={preset} onChange={(event) => setPreset(event.target.value as PresetOption)}>
                  <option value="TODAY">Hoy</option>
                  <option value="THIS_MONTH">Este mes</option>
                  <option value="YTD">Año en curso</option>
                  <option value="CUSTOM">Personalizado</option>
                </select>
              </div>
              {preset === 'CUSTOM' ? (
                <div className="form__row">
                  <label className="form__label" htmlFor="startDate">
                    Inicio
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                  <label className="form__label" htmlFor="endDate">
                    Fin
                  </label>
                  <input id="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </div>
              ) : null}
            </div>
            <div className="report-form__actions">
              <button className="button button--primary" onClick={handleGenerate} disabled={!canSubmit || loading}>
                {loading ? 'Generating...' : 'Create Report'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="card">
        {reports.length === 0 ? (
          <p>No reports yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rango</th>
                <th>Creado</th>
                <th>Creado por</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.fileName}</td>
                  <td>
                    {new Date(report.rangeStart).toLocaleDateString()} - {new Date(report.rangeEnd).toLocaleDateString()}
                  </td>
                  <td>{new Date(report.createdAt).toLocaleString()}</td>
                  <td>{report.createdBy ? `${report.createdBy.firstName} ${report.createdBy.lastName}` : 'N/A'}</td>
                  <td>
                    <div className="table__actions">
                      <button className="button-link" type="button" onClick={() => handleDownload(report)}>
                        Download
                      </button>
                      {isAdmin ? (
                        <button className="button-link" type="button" onClick={() => handleDelete(report)}>
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
