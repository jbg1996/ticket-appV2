import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';

export type User = {
  id: number;
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
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch<User>('/api/auth/me', { cache: 'no-store' })
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<User>('/api/auth/me', { cache: 'no-store' });
      setUser(data);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      cache: 'no-store'
    });
    localStorage.setItem('token', response.token);
    setUser(response.user);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const setPhoto = (file: File) => {
    const photoUrl = URL.createObjectURL(file);
    setUser((prev) => (prev ? { ...prev, photoUrl } : prev));
  };

  const value = useMemo(() => ({ user, login, logout, setPhoto, loading, refreshUser }), [user, loading, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
