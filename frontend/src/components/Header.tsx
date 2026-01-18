import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';

type HeaderProps = {
  color: string;
};

export function Header({ color }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header style={{ background: color }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>Ticket Manager</strong>
        </div>
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/tickets">Tickets</Link>
          {user?.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
          <button className="secondary" onClick={logout} style={{ marginLeft: '12px' }}>
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
