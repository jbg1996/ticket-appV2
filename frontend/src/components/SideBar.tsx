import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { ReportIcon } from './icons/ReportIcon';

const SIDEBAR_STORAGE_KEY = 'sidebarCollapsed';

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

const icons = {
  home: (
    <svg {...iconProps} aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  recent: (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  dashboard: <LayoutDashboard {...iconProps} aria-hidden="true" />,
  ticket: (
    <svg {...iconProps} aria-hidden="true">
      <path d="M3 9h18v6H3z" />
      <path d="M7 9v6" />
      <path d="M17 9v6" />
    </svg>
  ),
  report: <ReportIcon size={20} />,
  users: (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6" />
      <circle cx="17" cy="8" r="3" />
      <path d="M21 20c0-3.3-2.7-6-6-6" />
    </svg>
  ),
  tables: (
    <svg {...iconProps} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" />
      <path d="M3 10h18" />
      <path d="M9 4v16" />
    </svg>
  ),
  app: (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="M5.6 5.6l2.1 2.1" />
      <path d="M16.3 16.3l2.1 2.1" />
      <path d="M18.4 5.6l-2.1 2.1" />
      <path d="M7.7 16.3l-2.1 2.1" />
    </svg>
  )
};

function getInitialCollapsed() {
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored !== null) {
    return stored === 'true';
  }
  return window.innerWidth < 960;
}

export function SideBar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const isAdmin = user?.role === 'ADMIN';
  const canSeeDashboard = user?.role === 'ADMIN' || user?.role === 'TECH';

  const items = useMemo(
    () => [
      { label: 'Home', to: '/home', icon: icons.home },
      { label: 'Recent', to: '/recent', icon: icons.recent },
      ...(canSeeDashboard ? [{ label: 'Dashboard', to: '/dashboard', icon: icons.dashboard }] : []),
      { label: 'Tickets', to: '/tickets', icon: icons.ticket },
      { label: 'Report', to: '/reports', icon: icons.report }
    ],
    [canSeeDashboard]
  );

  const adminItems = useMemo(
    () => [
      { label: 'Users', to: '/admin/users', icon: icons.users },
      { label: 'Tables', to: '/admin/tables', icon: icons.tables },
      { label: 'App', to: '/admin/app', icon: icons.app }
    ],
    []
  );

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <button
        className="sidebar__toggle"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <span className="sidebar__toggle-icon" />
      </button>
      <nav className="sidebar__nav" aria-label="Primary">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
          >
            <span className="sidebar__icon">{item.icon}</span>
            <span className="sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {isAdmin && (
        <nav className="sidebar__nav sidebar__nav--admin" aria-label="Admin">
          {adminItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
            >
              <span className="sidebar__icon">{item.icon}</span>
              <span className="sidebar__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </aside>
  );
}
