import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';
import { useLayout } from '../components/AppLayout';
import { isValidHexColor } from '../utils/color';

export function AppSettingsPage() {
  const {
    headerColor,
    setHeaderColor,
    sidebarColor,
    setSidebarColor,
    appLogoUrl,
    setAppLogoUrl,
    companyLogoUrl,
    setCompanyLogoUrl
  } = useLayout();
  const [draftHeaderColor, setDraftHeaderColor] = useState(headerColor);
  const [draftSidebarColor, setDraftSidebarColor] = useState(sidebarColor);
  const [draftAppLogo, setDraftAppLogo] = useState(appLogoUrl ?? '');
  const [draftCompanyLogo, setDraftCompanyLogo] = useState(companyLogoUrl ?? '');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setDraftHeaderColor(headerColor);
  }, [headerColor]);

  useEffect(() => {
    setDraftSidebarColor(sidebarColor);
  }, [sidebarColor]);

  const headerColorError = useMemo(
    () => (isValidHexColor(draftHeaderColor) ? '' : 'Use a valid hex color (#RGB or #RRGGBB).'),
    [draftHeaderColor]
  );
  const sidebarColorError = useMemo(
    () => (isValidHexColor(draftSidebarColor) ? '' : 'Use a valid hex color (#RGB or #RRGGBB).'),
    [draftSidebarColor]
  );

  useEffect(() => {
    if (isValidHexColor(draftSidebarColor)) {
      setSidebarColor(draftSidebarColor);
    }
  }, [draftSidebarColor, setSidebarColor]);

  const handleSave = async () => {
    if (headerColorError || sidebarColorError) {
      setStatus('Please fix invalid color values before saving.');
      return;
    }

    setHeaderColor(draftHeaderColor);
    setSidebarColor(draftSidebarColor);
    setAppLogoUrl(draftAppLogo ? draftAppLogo : null);
    setCompanyLogoUrl(draftCompanyLogo ? draftCompanyLogo : null);
    try {
      await apiFetch('/api/settings/header-color', {
        method: 'PUT',
        body: JSON.stringify({ headerColor: draftHeaderColor, sidebarColor: draftSidebarColor })
      });
      setStatus('Saved.');
    } catch {
      setStatus('Saved locally. Unable to sync settings to API.');
    }
  };

  return (
    <div className="page">
      <h2>App Settings</h2>
      <p className="page__subtitle">Customize header/sidebar colors and logos.</p>
      <div className="card">
        <div className="grid">
          <label>
            Header Color
            <input type="color" value={draftHeaderColor} onChange={(event) => setDraftHeaderColor(event.target.value)} />
            <input value={draftHeaderColor} onChange={(event) => setDraftHeaderColor(event.target.value)} placeholder="#1f2937" />
            {headerColorError && <small className="text-error">{headerColorError}</small>}
          </label>
          <label>
            Sidebar Color
            <input type="color" value={draftSidebarColor} onChange={(event) => setDraftSidebarColor(event.target.value)} />
            <input value={draftSidebarColor} onChange={(event) => setDraftSidebarColor(event.target.value)} placeholder="#0f172a" />
            {sidebarColorError && <small className="text-error">{sidebarColorError}</small>}
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
