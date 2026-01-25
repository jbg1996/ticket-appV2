import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

type Report = { id: string; name: string; createdAt: string };

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

  useEffect(() => {
    apiFetch<Report[]>('/api/reports')
      .then(setReports)
      .catch(() => setReports([]));
  }, []);

  return (
    <div className="page">
      <h2>Reports</h2>
      <p className="page__subtitle">Generated reports ready for download.</p>
      <div className="card">
        {reports.length === 0 ? (
          <p>No reports yet. TODO: Connect report generation pipeline.</p>
        ) : (
          <ul className="list">
            {reports.map((report) => (
              <li key={report.id} className="list__item">
                <span>{report.name}</span>
                <a className="button-link" href={`${apiBase}/api/reports/${report.id}/download`}>
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
