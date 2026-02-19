import { createContext, CSSProperties, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SideBar } from './SideBar';
import { TopBar } from './TopBar';

const HEADER_COLOR_STORAGE_KEY = 'headerColor';
const SIDEBAR_COLOR_STORAGE_KEY = 'sidebarColor';
const APP_LOGO_STORAGE_KEY = 'appLogoUrl';
const COMPANY_LOGO_STORAGE_KEY = 'companyLogoUrl';
const DEFAULT_HEADER_COLOR = '#1f2937';
const DEFAULT_SIDEBAR_COLOR = '#0f172a';

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

function getReadableTextColor(backgroundColor: string) {
  const hex = backgroundColor.replace('#', '');
  const expandedHex = hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex;
  const value = Number.parseInt(expandedHex, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  return brightness > 160 ? '#0f172a' : '#f8fafc';
}

export function AppLayout({
  initialHeaderColor,
  initialSidebarColor
}: {
  initialHeaderColor?: string;
  initialSidebarColor?: string;
}) {
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(() => getStoredValue(APP_LOGO_STORAGE_KEY));
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(() => getStoredValue(COMPANY_LOGO_STORAGE_KEY));
  const [headerColor, setHeaderColor] = useState(() => getStoredValue(HEADER_COLOR_STORAGE_KEY) ?? initialHeaderColor ?? DEFAULT_HEADER_COLOR);
  const [sidebarColor, setSidebarColor] = useState(
    () => getStoredValue(SIDEBAR_COLOR_STORAGE_KEY) ?? initialSidebarColor ?? initialHeaderColor ?? DEFAULT_SIDEBAR_COLOR
  );

  useEffect(() => {
    if (initialHeaderColor && !getStoredValue(HEADER_COLOR_STORAGE_KEY)) {
      setHeaderColor(initialHeaderColor);
    }
  }, [initialHeaderColor]);

  useEffect(() => {
    if (initialSidebarColor && !getStoredValue(SIDEBAR_COLOR_STORAGE_KEY)) {
      setSidebarColor(initialSidebarColor);
      return;
    }

    if (!initialSidebarColor && initialHeaderColor && !getStoredValue(SIDEBAR_COLOR_STORAGE_KEY)) {
      setSidebarColor(initialHeaderColor);
    }
  }, [initialHeaderColor, initialSidebarColor]);

  useEffect(() => {
    localStorage.setItem(HEADER_COLOR_STORAGE_KEY, headerColor);
  }, [headerColor]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLOR_STORAGE_KEY, sidebarColor);
  }, [sidebarColor]);

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
      setHeaderColor,
      sidebarColor,
      setSidebarColor
    }),
    [appLogoUrl, companyLogoUrl, headerColor, sidebarColor]
  );

  const sidebarTextColor = getReadableTextColor(sidebarColor);
  const shellStyle = {
    '--app-sidebar-bg': sidebarColor,
    '--app-sidebar-fg': sidebarTextColor,
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
