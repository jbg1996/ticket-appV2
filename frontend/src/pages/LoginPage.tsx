import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { APP_LOGO_STORAGE_KEY, DEFAULT_HEADER_COLOR, HEADER_COLOR_STORAGE_KEY } from '../components/AppLayout';

function getStoredSetting(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@local.test');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [isLogoVisible, setIsLogoVisible] = useState(true);
  const [headerColor, setHeaderColor] = useState(DEFAULT_HEADER_COLOR);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    setHeaderColor(getStoredSetting(HEADER_COLOR_STORAGE_KEY) ?? DEFAULT_HEADER_COLOR);
    setAppLogoUrl(getStoredSetting(APP_LOGO_STORAGE_KEY));
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await login(email, password);
      navigate('/home', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card login-card">
          <div className="login-card__header" style={{ backgroundColor: headerColor }}>
            {appLogoUrl && isLogoVisible ? (
              <img src={appLogoUrl} alt="Application logo" className="login-card__logo" onError={() => setIsLogoVisible(false)} />
            ) : (
              <span className="login-card__logo-fallback">TiMapp</span>
            )}
          </div>
          <h2>Login</h2>
          <form onSubmit={handleSubmit} className="grid">
            <label>
              Email
              <div className="input-with-icon">
                <Mail size={16} aria-hidden="true" className="input-with-icon__icon" />
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="input-with-icon__control" />
              </div>
            </label>
            <label>
              Password
              <div className="input-with-icon">
                <Lock size={16} aria-hidden="true" className="input-with-icon__icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input-with-icon__control"
                />
              </div>
            </label>
            {error && <p style={{ color: 'crimson' }}>{error}</p>}
            <button type="submit">Sign in</button>
          </form>
        </div>
      </div>
    </div>
  );
}
