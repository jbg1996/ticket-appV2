import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
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

function AppShell() {
  const { user } = useAuth();
  const [headerColor, setHeaderColor] = useState('#1f2937');

  useEffect(() => {
    if (!user) return;
    apiFetch<{ value: string }>('/api/settings/header-color', { cache: 'no-store' })
      .then((data) => setHeaderColor(data.value))
      .catch(() => setHeaderColor('#1f2937'));
  }, [user]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout initialHeaderColor={headerColor} />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/recent" element={<RecentTicketsPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
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
