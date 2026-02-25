import { createContext, CSSProperties, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SideBar } from './SideBar';
import { TopBar } from './TopBar';
import { getSidebarTheme } from '../utils/color';

const headerColorStorageKey = 'headerColor';
const sidebarColorStorageKey = 'sidebarColor';
const appLogoStorageKey = 'appLogoUrl';
const companyLogoStorageKey = 'companyLogoUrl';
const defaultHeaderColor = '#1f2937';
const defaultSidebarColor = '#0f172a';

export type LayoutContextValue = {
  appLogoUrl: string | null;
  setAppLogoUrl: (value: string | null) => void;
  companyLogoUrl: string | null;
  setCompanyLogoUrl: (value: string | null) => void;
  headerColor: string;
  setHeaderColor: (value: string) => void;
  sidebarColor: string;
  setSidebarColor: (value: string) => void;
};

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

function getStoredValue(key: string) {
  const stored = localStorage.getItem(key);
  return stored ? stored : null;
}

export function AppLayout({
  initialHeaderColor,
  initialSidebarColor
}: {
  initialHeaderColor?: string;
  initialSidebarColor?: string;
}) {
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(() => getStoredValue(appLogoStorageKey));
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(() => getStoredValue(companyLogoStorageKey));
  const [headerColor, setHeaderColor] = useState(() => getStoredValue(headerColorStorageKey) ?? initialHeaderColor ?? defaultHeaderColor);
  const [sidebarColor, setSidebarColor] = useState(
    () => getStoredValue(sidebarColorStorageKey) ?? initialSidebarColor ?? initialHeaderColor ?? defaultSidebarColor
  );

  useEffect(() => {
    if (initialHeaderColor && !getStoredValue(headerColorStorageKey)) {
      setHeaderColor(initialHeaderColor);
    }
  }, [initialHeaderColor]);

  useEffect(() => {
    if (initialSidebarColor && !getStoredValue(sidebarColorStorageKey)) {
      setSidebarColor(initialSidebarColor);
      return;
    }

    if (!initialSidebarColor && initialHeaderColor && !getStoredValue(sidebarColorStorageKey)) {
      setSidebarColor(initialHeaderColor);
    }
  }, [initialHeaderColor, initialSidebarColor]);

  useEffect(() => {
    localStorage.setItem(headerColorStorageKey, headerColor);
  }, [headerColor]);

  useEffect(() => {
    localStorage.setItem(sidebarColorStorageKey, sidebarColor);
  }, [sidebarColor]);

  useEffect(() => {
    if (appLogoUrl) {
      localStorage.setItem(appLogoStorageKey, appLogoUrl);
      return;
    }
    localStorage.removeItem(appLogoStorageKey);
  }, [appLogoUrl]);

  useEffect(() => {
    if (companyLogoUrl) {
      localStorage.setItem(companyLogoStorageKey, companyLogoUrl);
      return;
    }
    localStorage.removeItem(companyLogoStorageKey);
  }, [companyLogoUrl]);

  const value = useMemo(
    () => ({
      appLogoUrl,
      setAppLogoUrl,
      companyLogoUrl,
      setCompanyLogoUrl,
      headerColor,
      setHeaderColor,
      sidebarColor,
      setSidebarColor
    }),
    [appLogoUrl, companyLogoUrl, headerColor, sidebarColor]
  );

  const sidebarTheme = getSidebarTheme(sidebarColor);
  const shellStyle = {
    '--app-sidebar-bg': sidebarTheme.sidebarBgColor,
    '--app-sidebar-fg': sidebarTheme.sidebarTextColor,
    '--app-sidebar-active-bg': sidebarTheme.activeBgColor,
    '--app-sidebar-active-fg': sidebarTheme.activeTextColor,
    '--app-header-bg': headerColor
  } as CSSProperties;

  return (
    <LayoutContext.Provider value={value}>
      <div className="app-shell" style={shellStyle}>
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
