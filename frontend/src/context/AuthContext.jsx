import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { login, register, logout, refreshToken, getMe } from '../services/authServices';
import socketService from '../services/socketService';

// Create context separately for better Fast Refresh support
const AuthContext = createContext();

// Create a separate provider component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    const initializeAuth = async () => {
      if (token && userId) {
        try {
          const userData = await getMe();
          setUser(userData);
          socketService.connect(userId);
        } catch (err) {
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      socketService.disconnect();
    };
  }, []);

  const loginUser = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const userData = await login(email, password);
      setUser(userData);
      socketService.connect(userData._id || userData.id);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (name, email, password) => {
    setLoading(true);
    setError('');
    try {
      const userData = await register(name, email, password);
      setUser(userData);
      // Connect socket in a try-catch to avoid blocking
      try {
        const userId = userData._id || userData.id;
        if (userId) {
          socketService.connect(userId);
        } else {
          console.warn('User ID not found for socket connection');
        }
      } catch (socketError) {
        console.error('Socket connection failed:', socketError);
      }
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    setError('');
    try {
      await logout();
      setUser(null);
      socketService.disconnect();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshUserToken = async () => {
    setLoading(true);
    setError('');
    try {
      const userData = await refreshToken();
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getUserDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const userData = await getMe();
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const contextValue = useMemo(() => ({
    user,
    loading,
    error,
    isAuthenticated: !!user,
    loginUser,
    registerUser,
    logoutUser,
    refreshUserToken,
    getUserDetails
  }), [user, loading, error]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Create custom hook separately
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Named exports for better Fast Refresh support
export { AuthProvider, useAuth };
export default AuthContext;