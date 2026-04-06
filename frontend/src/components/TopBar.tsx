import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useLayout } from './AppLayout';
import { apiFetch, changePassword } from '../services/api';

function getInitials(firstName?: string, lastName?: string) {
  const firstInitial = firstName?.trim().charAt(0) ?? '';
  const lastInitial = lastName?.trim().charAt(0) ?? '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || 'U';
}

type SearchTicket = {
  id: number;
  title: string;
  code?: string | null;
  status: string;
  priority: string;
};

export function TopBar() {
  const { user, logout } = useAuth();
  const { appLogoUrl, headerColor } = useLayout();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchTicket[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && searchRef.current.contains(event.target as Node)) return;
      setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const handle = window.setTimeout(() => {
      apiFetch<SearchTicket[]>(`/api/tickets/search?q=${encodeURIComponent(query)}&limit=8`)
        .then((data) => {
          setSearchResults(data);
          setSearchOpen(true);
        })
        .catch(() => {
          setSearchResults([]);
          setSearchOpen(false);
        })
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  const validatePassword = (password: string) => {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!/[A-Z]/.test(password)) return 'La contraseña debe incluir al menos una letra mayúscula.';
    if (!/[a-z]/.test(password)) return 'La contraseña debe incluir al menos una letra minúscula.';
    if (!/\d/.test(password)) return 'La contraseña debe incluir al menos un número.';
    if (!/[^A-Za-z0-9]/.test(password)) return 'La contraseña debe incluir al menos un carácter especial.';
    return '';
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordSaving(false);
  };

  const handlePasswordSubmit = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Completa todos los campos para cambiar tu contraseña.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordSuccess('Tu contraseña se actualizó correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSelectTicket = (ticketId: number) => {
    navigate(`/tickets/${ticketId}`);
    setSearchQuery('');
    setSearchOpen(false);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchResults.length > 0) {
      event.preventDefault();
      handleSelectTicket(searchResults[0].id);
    }
    if (event.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  return (
    <header className="topbar" style={{ background: headerColor || "var(--app-header-bg)" }}>
      <div className="topbar__left">
        {appLogoUrl ? (
          <img src={appLogoUrl} alt="App logo" className="topbar__logo" />
        ) : (
          <span className="topbar__logo-text">TiMapp</span>
        )}
      </div>
      <div className="topbar__center" ref={searchRef}>
        <div className="topbar__search-wrapper">
          <input
            className="topbar__search"
            type="search"
            placeholder="Search tickets…"
            aria-label="Search tickets"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          {searchOpen && (
            <div className="topbar__search-results">
              {searchLoading ? (
                <div className="topbar__search-empty">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="topbar__search-empty">No tickets found.</div>
              ) : (
                <ul>
                  {searchResults.map((ticket) => (
                    <li key={ticket.id}>
                      <button type="button" onClick={() => handleSelectTicket(ticket.id)}>
                        <div className="topbar__search-title">{ticket.title}</div>
                        <div className="topbar__search-meta">
                          {ticket.code && <span>{ticket.code}</span>}
                          <span>{ticket.status}</span>
                          <span>{ticket.priority}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="topbar__right" ref={menuRef}>
        <button
          className="avatar"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Open user menu"
        >
          {user?.photoUrl ? (
            <img src={user.photoUrl} alt="User avatar" className="avatar__image" />
          ) : (
            <span className="avatar__initials">{getInitials(user?.firstName, user?.lastName)}</span>
          )}
        </button>
        {menuOpen && (
          <div className="avatar-menu" role="menu">
            <button
              className="avatar-menu__item"
              onClick={() => {
                setPasswordOpen((open) => !open);
                setPasswordError('');
                setPasswordSuccess('');
              }}
              role="menuitem"
            >
              Cambiar contraseña
            </button>
            <button
              className="avatar-menu__item avatar-menu__item--danger"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              role="menuitem"
            >
              Logout
            </button>
            {passwordOpen && (
              <div className="grid" style={{ marginTop: '8px', minWidth: '280px' }}>
                <input
                  type="password"
                  placeholder="Contraseña actual"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
                <input
                  type="password"
                  placeholder="Nueva contraseña"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <input
                  type="password"
                  placeholder="Confirmar nueva contraseña"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                {passwordError && <p className="form-error">{passwordError}</p>}
                {passwordSuccess && <p style={{ color: '#166534', margin: 0 }}>{passwordSuccess}</p>}
                <div className="action-row">
                  <button onClick={handlePasswordSubmit} disabled={passwordSaving}>
                    {passwordSaving ? 'Guardando...' : 'Guardar contraseña'}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      setPasswordOpen(false);
                      resetPasswordForm();
                    }}
                    disabled={passwordSaving}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
