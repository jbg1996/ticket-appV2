import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

type User = { id: string; firstName: string; lastName: string; email: string; isActive: boolean; userType: { name: string } };

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    apiFetch<User[]>('/api/users')
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  return (
    <div className="page">
      <h2>Users</h2>
      <p className="page__subtitle">Manage teammates and access levels.</p>
      <div className="card">
        {users.length === 0 ? (
          <p>No users loaded. TODO: Wire up admin user list.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.firstName} {user.lastName}</td>
                  <td>{user.email}</td>
                  <td>{user.userType.name}</td>
                  <td>{user.isActive ? 'Active' : 'Disabled'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
