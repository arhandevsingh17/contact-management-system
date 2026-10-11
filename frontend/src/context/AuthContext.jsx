import { useState, useCallback } from 'react';
import { authService } from '../services/authService';
import { AuthContext } from './authContextDef';

export function AuthProvider({ children }) {
  // pehle localStorage se token/user load
  const [token, setToken] = useState(() => {
    try {
      return authService.getToken();
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      return authService.getCurrentUser();
    } catch {
      return null;
    }
  });

  // abhi loading use nahi kar rahe but baad me kaam aa sakta hai
  const [loading] = useState(false);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (name, email, password, role) => {
    const data = await authService.register(name, email, password, role);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'Admin',
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
