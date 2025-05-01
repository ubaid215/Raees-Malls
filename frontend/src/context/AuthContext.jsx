import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { login, register, logout, refreshToken, getMe } from '../services/authServices';
import socketService from '../services/socketService';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    loading: true, // Start as loading to prevent flicker
    error: null,
    needsFetch: false, // Changed from true so we control fetch explicitly
  });

  // Add this useEffect to initialize authentication state on app mount/refresh
  useEffect(() => {
    const initializeAuth = async () => {
      // If we have a token in localStorage, attempt to restore the session
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          // Try to either use cached user data or refresh the token
          await fetchUser();
        } catch (error) {
          // If fetchUser fails, try token refresh as fallback
          try {
            await refreshUserToken();
          } catch (refreshError) {
            // If both fail, we truly need to log out
            resetAuthState();
          }
        }
      } else {
        // No token, definitely not authenticated
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    initializeAuth();
    // No dependencies means this runs once on mount
  }, []);

  const setupSocketConnection = (user) => {
    const userId = user._id || user.id;
    if (userId) socketService.connect(userId);
  };

  const handleAuthError = (error) => {
    console.error('Auth error:', error);
    let errorMessage = error.message;

    // Check if the error is a validation error (from yup or backend)
    if (error.message.includes(',')) {
      // Validation errors are joined with commas
      errorMessage = error.message.split(', ').map((msg) => ({ msg }));
    } else if (error.message === 'This email is already registered') {
      errorMessage = [{ msg: 'This email is already registered' }];
    } else if (error.message.includes('Too many')) {
      errorMessage = [{ msg: error.message }]; // Rate limit error
    } else {
      errorMessage = [{ msg: errorMessage }];
    }

    setAuthState((prev) => ({
      ...prev,
      error: errorMessage,
      loading: false,
      needsFetch: false, // Changed from true to avoid infinite fetch loops
    }));

    if (error.message.includes('Too many requests')) {
      return;
    }
    resetAuthState();
  };

  const resetAuthState = () => {
    setAuthState({
      user: null,
      loading: false,
      error: null,
      needsFetch: false,
    });
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userData');
    localStorage.removeItem('userDataTimestamp');
    socketService.disconnect();
  };

  const fetchUser = async () => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const cachedUser = localStorage.getItem('userData');
      const cachedTimestamp = localStorage.getItem('userDataTimestamp');
      const now = Date.now();
      if (cachedUser && cachedTimestamp && now - parseInt(cachedTimestamp) < 300000) {
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
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const userData = await login(credentials.email, credentials.password);
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
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const newUser = await register(userData.name, userData.email, userData.password);
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
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await logout();
      resetAuthState();
    } catch (err) {
      setAuthState((prev) => ({ ...prev, error: [{ msg: err.message }] }));
      throw err;
    } finally {
      setAuthState((prev) => ({ ...prev, loading: false }));
    }
  };

  const refreshUserToken = async () => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const userData = await refreshToken();
      setAuthState((prev) => ({
        ...prev,
        user: userData || prev.user,
        loading: false,
        needsFetch: false, // Always set to false after attempt
      }));
      if (userData) setupSocketConnection(userData);
      return userData;
    } catch (err) {
      handleAuthError(err);
      throw err;
    }
  };

  const contextValue = useMemo(
    () => ({
      ...authState,
      isAuthenticated: !!authState.user,
      loginUser,
      registerUser,
      logoutUser,
      refreshUserToken,
      fetchUser,
    }),
    [authState]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
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