import React, { createContext, useState, useContext, useMemo } from 'react';
import { login, register, logout, refreshToken, getMe } from '../services/authServices';
import socketService from '../services/socketService';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    loading: false,
    error: null,
    needsFetch: true,
  });

  const setupSocketConnection = (user) => {
    const userId = user._id || user.id;
    if (userId) socketService.connect(userId);
  };

  const handleAuthError = (error) => {
    console.error('Auth error:', error);
    setAuthState(prev => ({
      ...prev,
      error: error.message,
      loading: false,
      needsFetch: true,
    }));
    if (error.message.includes('Too many requests')) {
      // Keep tokens for retry, don't reset
      return;
    }
    resetAuthState();
  };

  const resetAuthState = () => {
    setAuthState({
      user: null,
      loading: false,
      error: null,
      needsFetch: true,
    });
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userData');
    localStorage.removeItem('userDataTimestamp');
    socketService.disconnect();
  };

  const fetchUser = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Check cache first
      const cachedUser = localStorage.getItem('userData');
      const cachedTimestamp = localStorage.getItem('userDataTimestamp');
      const now = Date.now();
      if (cachedUser && cachedTimestamp && now - parseInt(cachedTimestamp) < 300000) { // 5 minutes
        const userData = JSON.parse(cachedUser);
        setAuthState({
          user: userData,
          loading: false,
          error: null,
          needsFetch: false,
        });
        setupSocketConnection(userData);
        return userData;
      }

      const userData = await getMe();
      setAuthState({
        user: userData,
        loading: false,
        error: null,
        needsFetch: false,
      });
      setupSocketConnection(userData);
      return userData;
    } catch (err) {
      handleAuthError(err);
      throw err;
    }
  };

  const loginUser = async (credentials) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const userData = await login(credentials);
      setAuthState({
        user: userData,
        loading: false,
        error: null,
        needsFetch: false,
      });
      setupSocketConnection(userData);
      return userData;
    } catch (err) {
      handleAuthError(err);
      throw err;
    }
  };

  const registerUser = async (userData) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const newUser = await register(userData);
      setAuthState({
        user: newUser,
        loading: false,
        error: null,
        needsFetch: false,
      });
      setupSocketConnection(newUser);
      return newUser;
    } catch (err) {
      handleAuthError(err);
      throw err;
    }
  };

  const logoutUser = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await logout();
      resetAuthState();
    } catch (err) {
      setAuthState(prev => ({ ...prev, error: err.message }));
      throw err;
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const refreshUserToken = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const userData = await refreshToken();
      setAuthState(prev => ({
        ...prev,
        user: userData || prev.user,
        loading: false,
        needsFetch: !userData, // Fetch user if no user data returned
      }));
      if (userData) setupSocketConnection(userData);
      return userData;
    } catch (err) {
      handleAuthError(err);
      throw err;
    }
  };

  const contextValue = useMemo(() => ({
    ...authState,
    isAuthenticated: !!authState.user,
    loginUser,
    registerUser,
    logoutUser,
    refreshUserToken,
    fetchUser,
  }), [authState]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider, useAuth };
export default AuthContext;