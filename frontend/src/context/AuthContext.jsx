import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStoredToken, getStoredUser, authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(() => Boolean(getStoredToken()));

  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('cms:unauthorized', handleUnauthorized);
      return () => {
        window.removeEventListener('cms:unauthorized', handleUnauthorized);
      };
    }
  }, [logout]);

  useEffect(() => {
    let isMounted = true;
    const validateSession = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (isMounted) setIsInitializing(false);
        return;
      }

      try {
        const response = await authService.getMe();
        if (isMounted && response?.user) {
          setUser((prev) => ({ ...(prev || {}), ...response.user }));
        }
      } catch (err) {
        // Clear stored session and log out only when 401 or token is definitively invalid.
        // Do not automatically log out on network errors or 5xx server responses.
        if (err?.status === 401) {
          if (isMounted) {
            logout();
          } else {
            authService.logout();
          }
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    validateSession();

    return () => {
      isMounted = false;
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
    isInitializing,
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
