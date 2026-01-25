import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useLayout } from '../components/AppLayout';

export function AppSettingsPage() {
  const { headerColor, setHeaderColor, appLogoUrl, setAppLogoUrl, companyLogoUrl, setCompanyLogoUrl } = useLayout();
  const [draftHeaderColor, setDraftHeaderColor] = useState(headerColor);
  const [draftAppLogo, setDraftAppLogo] = useState(appLogoUrl ?? '');
  const [draftCompanyLogo, setDraftCompanyLogo] = useState(companyLogoUrl ?? '');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setDraftHeaderColor(headerColor);
  }, [headerColor]);

  const handleSave = async () => {
    setHeaderColor(draftHeaderColor);
    setAppLogoUrl(draftAppLogo ? draftAppLogo : null);
    setCompanyLogoUrl(draftCompanyLogo ? draftCompanyLogo : null);
    try {
      await apiFetch('/api/settings/header-color', { method: 'PUT', body: JSON.stringify({ value: draftHeaderColor }) });
      setStatus('Saved.');
    } catch {
      setStatus('Saved locally. TODO: connect header color API.');
    }
  };

  return (
    <div className="page">
      <h2>App Settings</h2>
      <p className="page__subtitle">Customize the header color and logos.</p>
      <div className="card">
        <div className="grid">
          <label>
            Header Color
            <input type="color" value={draftHeaderColor} onChange={(event) => setDraftHeaderColor(event.target.value)} />
          </label>
          <label>
            App Logo URL
            <input
              placeholder="https://..."
              value={draftAppLogo}
              onChange={(event) => setDraftAppLogo(event.target.value)}
            />
          </label>
          <label>
            Company Logo URL
            <input
              placeholder="https://..."
              value={draftCompanyLogo}
              onChange={(event) => setDraftCompanyLogo(event.target.value)}
            />
          </label>
          <button onClick={handleSave}>Save settings</button>
          {status && <p className="page__subtitle">{status}</p>}
        </div>
      </div>
    </div>
  );
}
