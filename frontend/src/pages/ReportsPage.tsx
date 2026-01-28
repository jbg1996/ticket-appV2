import { useEffect, useState } from 'react';
import { apiFetch, apiFetchBlob } from '../services/api';

type Report = { id: string; name: string; createdAt: string };

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    apiFetch<Report[]>('/api/reports')
      .then(setReports)
      .catch(() => setReports([]));
  }, []);

  const handleDownload = async (report: Report) => {
    const blob = await apiFetchBlob(`/api/reports/${report.id}/download`);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.name;
    link.click();
    window.URL.revokeObjectURL(url);
  };

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
                <button className="button-link" onClick={() => handleDownload(report)}>
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
