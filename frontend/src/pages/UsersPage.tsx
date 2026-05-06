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

  const validatePassword = (password: string) => {
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
    if (!/\d/.test(password)) return 'Password must include at least one number.';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.';
    return '';
  };

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

  const handleCreateUser = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      if (!newUser.userTypeId) {
        throw new Error('Select a role for the user.');
      }
      const passwordValidationError = validatePassword(newUser.password);
      if (passwordValidationError) {
        throw new Error(passwordValidationError);
      }
      await createUser({ ...newUser, phone: newUser.phone || undefined, userTypeId: Number(newUser.userTypeId) });
      setNewUser({ firstName: '', lastName: '', email: '', password: '', phone: '', userTypeId: '' });
      loadUsers();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (user: User) => {
    setEditingUserId(user.id);
    setEditUser({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      userTypeId: user.userType.id,
      isActive: user.isActive
    });
  };

  const handleEditCancel = () => {
    setEditingUserId(null);
    setEditUser({ firstName: '', lastName: '', phone: '', userTypeId: '', isActive: true });
  };

  const handleEditSave = async () => {
    if (!editingUserId) return;
    setLoading(true);
    setErrorMessage('');
    try {
      await updateUser(editingUserId, {
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        phone: editUser.phone || undefined,
        userTypeId: editUser.userTypeId ? Number(editUser.userTypeId) : undefined,
        isActive: editUser.isActive
      });
      handleEditCancel();
      loadUsers();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

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
