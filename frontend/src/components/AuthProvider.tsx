import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';

export type User = {
  id: string;
  email: string;
  role: 'ADMIN' | 'TECH' | 'REQUESTER';
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
};

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setPhoto: (file: File) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }
    apiFetch<User>('/api/auth/me')
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('token', response.token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const setPhoto = (file: File) => {
    const photoUrl = URL.createObjectURL(file);
    setUser((prev) => (prev ? { ...prev, photoUrl } : prev));
  };

  const value = useMemo(() => ({ user, login, logout, setPhoto }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
