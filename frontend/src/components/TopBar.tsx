import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useAuth } from './AuthProvider';
import { useLayout } from './AppLayout';

function getInitials(firstName?: string, lastName?: string) {
  const firstInitial = firstName?.trim().charAt(0) ?? '';
  const lastInitial = lastName?.trim().charAt(0) ?? '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || 'U';
}

export function TopBar() {
  const { user, logout, setPhoto } = useAuth();
  const { ticketSearchQuery, setTicketSearchQuery, appLogoUrl, headerColor } = useLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current || menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setMenuOpen(false);
  };

  return (
    <header className="topbar" style={{ background: headerColor }}>
      <div className="topbar__left">
        {appLogoUrl ? (
          <img src={appLogoUrl} alt="App logo" className="topbar__logo" />
        ) : (
          <span className="topbar__logo-text">TiMapp</span>
        )}
      </div>
      <div className="topbar__center">
        <input
          className="topbar__search"
          type="search"
          placeholder="Search tickets…"
          aria-label="Search tickets"
          value={ticketSearchQuery}
          onChange={(event) => setTicketSearchQuery(event.target.value)}
        />
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
            <button className="avatar-menu__item" onClick={handleUploadClick} role="menuitem">
              Upload profile photo
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
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>
    </header>
  );
}
