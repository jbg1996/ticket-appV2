import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SideBar } from './SideBar';
import { TopBar } from './TopBar';

const HEADER_COLOR_STORAGE_KEY = 'headerColor';
const APP_LOGO_STORAGE_KEY = 'appLogoUrl';
const COMPANY_LOGO_STORAGE_KEY = 'companyLogoUrl';

export type LayoutContextValue = {
  appLogoUrl: string | null;
  setAppLogoUrl: (value: string | null) => void;
  companyLogoUrl: string | null;
  setCompanyLogoUrl: (value: string | null) => void;
  headerColor: string;
  setHeaderColor: (value: string) => void;
};

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

function getStoredValue(key: string) {
  const stored = localStorage.getItem(key);
  return stored ? stored : null;
}

export function AppLayout({ initialHeaderColor }: { initialHeaderColor?: string }) {
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(() => getStoredValue(APP_LOGO_STORAGE_KEY));
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(() => getStoredValue(COMPANY_LOGO_STORAGE_KEY));
  const [headerColor, setHeaderColor] = useState(() => getStoredValue(HEADER_COLOR_STORAGE_KEY) ?? initialHeaderColor ?? '#1f2937');

  useEffect(() => {
    if (initialHeaderColor && !getStoredValue(HEADER_COLOR_STORAGE_KEY)) {
      setHeaderColor(initialHeaderColor);
    }
  }, [initialHeaderColor]);

  useEffect(() => {
    localStorage.setItem(HEADER_COLOR_STORAGE_KEY, headerColor);
  }, [headerColor]);

  useEffect(() => {
    if (appLogoUrl) {
      localStorage.setItem(APP_LOGO_STORAGE_KEY, appLogoUrl);
      return;
    }
    localStorage.removeItem(APP_LOGO_STORAGE_KEY);
  }, [appLogoUrl]);

  useEffect(() => {
    if (companyLogoUrl) {
      localStorage.setItem(COMPANY_LOGO_STORAGE_KEY, companyLogoUrl);
      return;
    }
    localStorage.removeItem(COMPANY_LOGO_STORAGE_KEY);
  }, [companyLogoUrl]);

  const value = useMemo(
    () => ({
      appLogoUrl,
      setAppLogoUrl,
      companyLogoUrl,
      setCompanyLogoUrl,
      headerColor,
      setHeaderColor
    }),
    [appLogoUrl, companyLogoUrl, headerColor]
  );

  return (
    <LayoutContext.Provider value={value}>
      <div className="app-shell">
        <TopBar />
        <div className="app-shell__body">
          <SideBar />
          <main className="app-shell__main" aria-label="Main content">
            <Outlet />
          </main>
        </div>
      </div>
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within AppLayout');
  }
  return context;
}
