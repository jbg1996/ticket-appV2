import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteUser, getUsers } from '../services/api';

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  userType: { id: number; name: string; code: string };
};

export function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadUsers = () => {
    getUsers()
      .then((data) => setUsers(data as User[]))
      .catch((error) => {
        console.error(error);
        setUsers([]);
        setErrorMessage((error as Error).message);
      });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (userId: number) => {
    setLoading(true);
    setErrorMessage('');
    try {
      await deleteUser(userId);
      loadUsers();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Users</h2>
      <p className="page__subtitle">Manage teammates and access levels.</p>

      <div className="card">
        <div className="tickets-toolbar">
          <h3>Users</h3>
          <button onClick={() => navigate('/admin/users/new')} disabled={loading}>Create User</button>
        </div>

        {users.length === 0 ? (
          <p>No users loaded.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.firstName} {user.lastName}</td>
                  <td>{user.email}</td>
                  <td>{user.userType.name}</td>
                  <td>{user.isActive ? 'Active' : 'Disabled'}</td>
                  <td className="action-row">
                    <button onClick={() => navigate(`/admin/users/${user.id}/edit`)} disabled={loading}>Edit</button>
                    <button className="secondary" onClick={() => handleDelete(user.id)} disabled={loading}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {errorMessage && <p className="form-error">{errorMessage}</p>}
      </div>
    </div>
  );
}
