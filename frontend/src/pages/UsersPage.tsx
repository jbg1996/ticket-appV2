import { useEffect, useState } from 'react';
import { createUser, deleteUser, getUsers, getUserTypes, updateUser } from '../services/api';

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  userType: { id: number; name: string; code: string };
};

type UserType = { id: number; name: string };

type NewUserForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  userTypeId: number | '';
};

type EditUserForm = {
  firstName: string;
  lastName: string;
  phone: string;
  userTypeId: number | '';
  isActive: boolean;
};

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [newUser, setNewUser] = useState<NewUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    userTypeId: ''
  });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUser, setEditUser] = useState<EditUserForm>({
    firstName: '',
    lastName: '',
    phone: '',
    userTypeId: '',
    isActive: true
  });
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
          <select
            value={newUser.userTypeId.toString()}
            onChange={(event) => setNewUser({ ...newUser, userTypeId: event.target.value ? Number(event.target.value) : '' })}
          >
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
            <select
              value={editUser.userTypeId.toString()}
              onChange={(event) => setEditUser({ ...editUser, userTypeId: event.target.value ? Number(event.target.value) : '' })}
            >
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
