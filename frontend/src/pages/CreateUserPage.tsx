import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser, getUserTypes } from '../services/api';

type UserType = { id: number; name: string };

type NewUserForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  userTypeId: number | '';
};

const initialForm: NewUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  userTypeId: ''
};

function validatePassword(password: string) {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.';
  return '';
}

export function CreateUserPage() {
  const navigate = useNavigate();
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [form, setForm] = useState<NewUserForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    getUserTypes()
      .then((data) => setUserTypes(data as UserType[]))
      .catch((error) => {
        console.error(error);
        setErrorMessage((error as Error).message);
      });
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      if (!form.userTypeId) {
        throw new Error('Select a role for the user.');
      }
      const passwordValidationError = validatePassword(form.password);
      if (passwordValidationError) {
        throw new Error(passwordValidationError);
      }

      await createUser({
        ...form,
        userTypeId: Number(form.userTypeId),
        phone: form.phone || undefined
      });

      navigate('/admin/users');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Create User</h2>
      <p className="page__subtitle">Create a new teammate account.</p>

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
          <input
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
          <input
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
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

          <div className="action-row">
            <button onClick={handleSubmit} disabled={loading}>Create User</button>
            <button className="secondary" onClick={() => navigate('/admin/users')} disabled={loading}>Cancel</button>
          </div>
        </div>

        {errorMessage && <p className="form-error">{errorMessage}</p>}
      </div>
    </div>
  );
}
