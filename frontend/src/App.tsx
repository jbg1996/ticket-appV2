import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import { CreateTicketPage } from './pages/CreateTicketPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { AdminPage } from './pages/AdminPage';
import { HomePage } from './pages/HomePage';
import { RecentTicketsPage } from './pages/RecentTicketsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { TablesPage } from './pages/TablesPage';
import { AppSettingsPage } from './pages/AppSettingsPage';
import { apiFetch } from './services/api';
import './styles/main.css';

type AppSettings = {
  headerColor: string;
  sidebarColor: string;
};

function AppShell() {
  const { user } = useAuth();
  const [appSettings, setAppSettings] = useState<AppSettings>({ headerColor: '#1f2937', sidebarColor: '#0f172a' });

  useEffect(() => {
    if (!user) return;
    apiFetch<AppSettings>('/api/settings/header-color', { cache: 'no-store' })
      .then((data) => setAppSettings(data))
      .catch(() => setAppSettings({ headerColor: '#1f2937', sidebarColor: '#0f172a' }));
  }, [user]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout initialHeaderColor={appSettings.headerColor} initialSidebarColor={appSettings.sidebarColor} />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["ADMIN", "TECH"]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/home" element={<HomePage />} />
          <Route path="/recent" element={<RecentTicketsPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/new" element={<CreateTicketPage />} />
          <Route
            path="/tickets/:id"
            element={(
              <ErrorBoundary>
                <TicketDetailPage />
              </ErrorBoundary>
            )}
          />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/tables" element={<TablesPage />} />
            <Route path="/admin/app" element={<AppSettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
