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
import { CreateUserPage } from './pages/CreateUserPage';
import { EditUserPage } from './pages/EditUserPage';
import { TablesPage } from './pages/TablesPage';
import { AppSettingsPage } from './pages/AppSettingsPage';
import { apiFetch } from './services/api';
import './styles/main.css';

type AppSettings = {
  headerColor: string;
  sidebarColor: string;
  appLogoUrl: string;
  companyLogoUrl: string;
};

function AppShell() {
  const { user } = useAuth();
  const [appSettings, setAppSettings] = useState<AppSettings>({
    headerColor: '#1e1e1e',
    sidebarColor: '#282828',
    appLogoUrl: 'https://res.cloudinary.com/dcjouquja/image/upload/v1771182335/Logo_TiMapp.png',
    companyLogoUrl: 'https://res.cloudinary.com/dcjouquja/image/upload/v1771182565/Logo_Icono_TiMapp.png'
  });

  useEffect(() => {
    if (!user) return;
    apiFetch<AppSettings>('/api/settings/header-color', { cache: 'no-store' })
      .then((data) => setAppSettings(data))
      .catch(() =>
        setAppSettings({
          headerColor: '#1e1e1e',
          sidebarColor: '#282828',
          appLogoUrl: 'https://res.cloudinary.com/dcjouquja/image/upload/v1771182335/Logo_TiMapp.png',
          companyLogoUrl: 'https://res.cloudinary.com/dcjouquja/image/upload/v1771182565/Logo_Icono_TiMapp.png'
        })
      );
  }, [user]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout
                initialHeaderColor={appSettings.headerColor}
                initialSidebarColor={appSettings.sidebarColor}
                initialAppLogoUrl={appSettings.appLogoUrl}
                initialCompanyLogoUrl={appSettings.companyLogoUrl}
              />
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
            <Route path="/admin/users/new" element={<CreateUserPage />} />
            <Route path="/admin/users/:id/edit" element={<EditUserPage />} />
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
