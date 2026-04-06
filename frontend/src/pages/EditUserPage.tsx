import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUsers, getUserTypes, updateUser } from '../services/api';

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

type EditUserForm = {
  firstName: string;
  lastName: string;
  phone: string;
  userTypeId: number | '';
  isActive: boolean;
  password: string;
};

const initialForm: EditUserForm = {
  firstName: '',
  lastName: '',
  phone: '',
  userTypeId: '',
  isActive: true,
  password: ''
};

function validatePassword(password: string) {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.';
  return '';
}

export function EditUserPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [form, setForm] = useState<EditUserForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const parsedId = Number(id);
    if (!parsedId) {
      setErrorMessage('Invalid user id.');
      return;
    }

    Promise.all([getUsers(), getUserTypes()])
      .then(([usersData, userTypesData]) => {
        const foundUser = (usersData as User[]).find((candidate) => candidate.id === parsedId);
        if (!foundUser) {
          throw new Error('User not found.');
        }

        setUserTypes(userTypesData as UserType[]);
        setUserEmail(foundUser.email);
        setForm({
          firstName: foundUser.firstName,
          lastName: foundUser.lastName,
          phone: foundUser.phone ?? '',
          userTypeId: foundUser.userType.id,
          isActive: foundUser.isActive,
          password: ''
        });
      })
      .catch((error) => {
        console.error(error);
        setErrorMessage((error as Error).message);
      });
  }, [id]);

  const handleSubmit = async () => {
    const parsedId = Number(id);
    if (!parsedId) return;

    setLoading(true);
    setErrorMessage('');
    try {
      const payload: {
        firstName: string;
        lastName: string;
        phone?: string;
        userTypeId?: number;
        isActive: boolean;
        password?: string;
      } = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        userTypeId: form.userTypeId ? Number(form.userTypeId) : undefined,
        isActive: form.isActive
      };

      if (form.password.trim()) {
        const passwordValidationError = validatePassword(form.password);
        if (passwordValidationError) {
          throw new Error(passwordValidationError);
        }
        payload.password = form.password;
      }

      await updateUser(parsedId, payload);
      navigate('/admin/users');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Edit User</h2>
      <p className="page__subtitle">Update user information, role, status and optionally password.</p>

      <div className="card">
        <div className="grid">
          <input
            placeholder="First name"
            value={form.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
          />
          <input
            placeholder="Last name"
            value={form.lastName}
            onChange={(event) => setForm({ ...form, lastName: event.target.value })}
          />
          <input value={userEmail} disabled aria-label="Email" />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
          <select
            value={form.userTypeId.toString()}
            onChange={(event) => setForm({ ...form, userTypeId: event.target.value ? Number(event.target.value) : '' })}
          >
            <option value="">Select role</option>
            {userTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>

          <input
            placeholder="New password (optional)"
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />

          <label className="toggle-switch" htmlFor="user-active-toggle">
            <input
              id="user-active-toggle"
              className="toggle-switch__input"
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            <span className="toggle-switch__track" aria-hidden="true">
              <span className="toggle-switch__thumb" />
            </span>
            <span className="toggle-switch__label">Active</span>
          </label>

          <div className="action-row">
            <button onClick={handleSubmit} disabled={loading}>Save</button>
            <button className="secondary" onClick={() => navigate('/admin/users')} disabled={loading}>Cancel</button>
          </div>
        </div>

        {errorMessage && <p className="form-error">{errorMessage}</p>}
      </div>
    </div>
  );
}
