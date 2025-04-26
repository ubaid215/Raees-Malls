/* eslint-disable no-unused-vars */
import { createContext, useState, useEffect, useCallback } from 'react';
import { 
  login, 
  register, 
  logout, 
  getMe, 
  refreshToken 
} from '../services/api';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Secure storage abstraction
  const secureStorage = {
    get: (key) => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Storage access error:', error);
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Storage access error:', error);
      }
    },
    remove: (key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Storage access error:', error);
      }
    },
    clear: () => {
      try {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } catch (error) {
        console.error('Storage access error:', error);
      }
    }
  };

  // Store tokens from response
  const storeTokens = (data) => {
    if (data.accessToken) {
      secureStorage.set('accessToken', data.accessToken);
    }
    if (data.refreshToken) {
      secureStorage.set('refreshToken', data.refreshToken);
    }
  };

  // Clear all auth data
  const clearAuthData = () => {
    secureStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  // Fetch and set user data
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await getMe();
      setUser(data.user);
      setIsAuthenticated(true);
      setError(null);
      return data.user;
    } catch (err) {
      clearAuthData();
      throw err;
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = secureStorage.get('accessToken');
      
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        await fetchUser();
      } catch (err) {
        // Attempt token refresh if access token is invalid
        const refreshToken = secureStorage.get('refreshToken');
        if (refreshToken) {
          try {
            const { data } = await refreshToken({ refreshToken });
            storeTokens(data);
            await fetchUser();
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            clearAuthData();
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [fetchUser]);

  // Handle user login
  const loginUser = async (credentials) => {
    setLoading(true);
    try {
      const { data } = await login(credentials);
      storeTokens(data.tokens);
      await fetchUser();
      return { success: true };
    } catch (err) {
      clearAuthData();
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Handle user registration
  const registerUser = async (userData) => {
    setLoading(true);
    try {
      const { data } = await register(userData);
      storeTokens(data.tokens);
      await fetchUser();
      return { success: true };
    } catch (err) {
      clearAuthData();
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const logoutUser = async () => {
    setLoading(true);
    try {
      await logout();
      clearAuthData();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      clearAuthData(); // Force clear even if logout API fails
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  // Refresh token
  const refreshUserToken = async () => {
    try {
      const refreshToken = secureStorage.get('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const { data } = await refreshToken({ refreshToken });
      storeTokens(data);
      await fetchUser();
      return data.accessToken;
    } catch (err) {
      console.error('Token refresh failed:', err);
      clearAuthData();
      navigate('/login');
      throw err;
    }
  };

  // Value to provide to consumers
  const contextValue = {
    user,
    isAuthenticated,
    loading,
    error,
    loginUser,
    registerUser,
    logoutUser,
    refreshUserToken,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};