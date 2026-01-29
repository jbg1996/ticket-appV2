import { useEffect, useState } from 'react';
import { createUser, deleteUser, getUsers, getUserTypes, updateUser } from '../services/api';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  userType: { id: string; name: string; code: string };
};

type UserType = { id: string; name: string };

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', userTypeId: '' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState({ firstName: '', lastName: '', phone: '', userTypeId: '', isActive: true });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadUsers = () => {
    getUsers()
      .then((data) => setUsers(data as User[]))
      .catch((error) => {
        console.error(error);
        setUsers([]);
      });
  };

  const loadUserTypes = () => {
    getUserTypes()
      .then((data) => setUserTypes(data as UserType[]))
      .catch((error) => {
        console.error(error);
        setUserTypes([]);
      });
  };

  useEffect(() => {
    loadUsers();
    loadUserTypes();
  }, []);

  const handleCreateUser = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await createUser({ ...newUser, phone: newUser.phone || undefined });
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
        userTypeId: editUser.userTypeId || undefined,
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

  const handleDelete = async (userId: string) => {
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
        <h3>Create User</h3>
        <div className="grid">
          <input
            placeholder="First name"
            value={newUser.firstName}
            onChange={(event) => setNewUser({ ...newUser, firstName: event.target.value })}
          />
          <input
            placeholder="Last name"
            value={newUser.lastName}
            onChange={(event) => setNewUser({ ...newUser, lastName: event.target.value })}
          />
          <input placeholder="Email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} />
          <input
            placeholder="Phone"
            value={newUser.phone}
            onChange={(event) => setNewUser({ ...newUser, phone: event.target.value })}
          />
          <input
            placeholder="Password"
            type="password"
            value={newUser.password}
            onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
          />
          <select value={newUser.userTypeId} onChange={(event) => setNewUser({ ...newUser, userTypeId: event.target.value })}>
            <option value="">Select role</option>
            {userTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <button onClick={handleCreateUser} disabled={loading}>Create</button>
        </div>
        {errorMessage && <p style={{ color: '#b91c1c' }}>{errorMessage}</p>}
      </div>
      <div className="card">
        <h3>Users</h3>
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
                    <button onClick={() => handleEditStart(user)} disabled={loading}>Edit</button>
                    <button className="secondary" onClick={() => handleDelete(user.id)} disabled={loading}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {editingUserId && (
        <div className="card">
          <h3>Edit User</h3>
          <div className="grid">
            <input
              placeholder="First name"
              value={editUser.firstName}
              onChange={(event) => setEditUser({ ...editUser, firstName: event.target.value })}
            />
            <input
              placeholder="Last name"
              value={editUser.lastName}
              onChange={(event) => setEditUser({ ...editUser, lastName: event.target.value })}
            />
            <input
              placeholder="Phone"
              value={editUser.phone}
              onChange={(event) => setEditUser({ ...editUser, phone: event.target.value })}
            />
            <select value={editUser.userTypeId} onChange={(event) => setEditUser({ ...editUser, userTypeId: event.target.value })}>
              <option value="">Select role</option>
              {userTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <label>
              <input
                type="checkbox"
                checked={editUser.isActive}
                onChange={(event) => setEditUser({ ...editUser, isActive: event.target.checked })}
              />
              Active
            </label>
            <div className="action-row">
              <button onClick={handleEditSave} disabled={loading}>Save</button>
              <button className="secondary" onClick={handleEditCancel} disabled={loading}>Cancel</button>
            </div>
          </div>
          {errorMessage && <p style={{ color: '#b91c1c' }}>{errorMessage}</p>}
        </div>
      )}
    </div>
  );
}
