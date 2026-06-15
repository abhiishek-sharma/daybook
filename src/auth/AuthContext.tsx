import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

interface AuthState {
  ready: boolean;
  authed: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api.get<{ authed: boolean; username?: string }>('/api/auth/me')
      .then(r => {
        if (!mounted) return;
        setAuthed(r.authed);
        setUsername(r.username ?? null);
      })
      .catch(() => {})
      .finally(() => mounted && setReady(true));
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const r = await api.post<{ authed: boolean; username: string }>('/api/auth/login', { username, password });
    setAuthed(r.authed);
    setUsername(r.username);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    setAuthed(false);
    setUsername(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ ready, authed, username, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
