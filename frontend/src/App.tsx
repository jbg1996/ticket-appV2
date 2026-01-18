import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Header } from './components/Header';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { AdminPage } from './pages/AdminPage';
import { apiFetch } from './services/api';
import './styles/main.css';

function AppShell() {
  const { user } = useAuth();
  const [headerColor, setHeaderColor] = useState('#1f2937');

  useEffect(() => {
    if (!user) return;
    apiFetch<{ value: string }>('/api/settings/header-color')
      .then((data) => setHeaderColor(data.value))
      .catch(() => setHeaderColor('#1f2937'));
  }, [user]);

  return (
    <BrowserRouter>
      {user && <Header color={headerColor} />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <TicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute>
              <TicketDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
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
