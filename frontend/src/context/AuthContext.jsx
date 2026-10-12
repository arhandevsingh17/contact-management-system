import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStoredToken, getStoredUser, authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('cms:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('cms:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      setToken(response.token);
      setUser(response.user);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      return await authService.register(userData);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to consume the auth context
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
