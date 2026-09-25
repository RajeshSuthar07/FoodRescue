import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('fr_user');
    if (!raw || raw === "undefined" || raw === "null") {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error("Invalid auth data:", raw);
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fr_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.data);
        localStorage.setItem('fr_user', JSON.stringify(res.data.data));
      })
      .catch(() => {
        localStorage.removeItem('fr_token');
        localStorage.removeItem('fr_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: u } = res.data.data;
    localStorage.setItem('fr_token', token);
    localStorage.setItem('fr_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload);
    const { token, user: u } = res.data.data;

    // Drivers register as PENDING and get no token until an admin
    // approves them — don't log them in, just report back so the UI can
    // show a "waiting for approval" message instead of a dashboard.
    if (!token) {
      return { pending: true, user: u, message: res.data.message };
    }

    localStorage.setItem('fr_token', token);
    localStorage.setItem('fr_user', JSON.stringify(u));
    setUser(u);
    return { pending: false, user: u, message: res.data.message };
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get('/auth/me');
    setUser(res.data.data);
    localStorage.setItem('fr_user', JSON.stringify(res.data.data));
    return res.data.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fr_token');
    localStorage.removeItem('fr_user');
    setUser(null);
    // Go to the public home/landing page after logout, not the login form —
    // logging out is not the same as "please log back in immediately".
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
