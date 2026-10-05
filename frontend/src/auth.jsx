import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setStats(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.me();
      setUser(data.user);
      setStats(data.stats);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email, password) {
    const data = await api.login({ email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    await refresh();
    return data.user;
  }

  async function register(username, email, password) {
    const data = await api.register({ username, email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    await refresh();
    return data.user;
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    setStats(null);
  }

  return (
    <AuthCtx.Provider value={{ user, stats, loading, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
