import { useState } from 'react';
import { useAuth } from '../components/AuthProvider';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@local.test');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '420px', margin: '0 auto' }}>
        <h2>Login</h2>
        <form onSubmit={handleSubmit} className="grid">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          <button type="submit">Sign in</button>
        </form>
      </div>
    </div>
  );
}
