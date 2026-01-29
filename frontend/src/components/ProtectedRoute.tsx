import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="page">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }
  return children;
}
