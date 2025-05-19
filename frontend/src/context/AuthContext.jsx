import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { 
  login, 
  register, 
  logout, 
  refreshToken, 
  getMe, 
  updateUser, 
  googleLogin 
} from '../services/authServices';
import socketService from '../services/socketService';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    loading: true,
    error: null,
    needsFetch: false,
  });

  useEffect(() => {
    const initializeAuth = async () => {
      // Skip Google redirect handling; let GoogleCallback.jsx handle it
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          await fetchUser();
        } catch (error) {
          try {
            await refreshUserToken();
          } catch (refreshError) {
            resetAuthState();
          }
        }
      } else {
        setAuthState((prev) => ({ ...prev, loading: false }));
      }
    };

    initializeAuth();
  }, []);

  const setupSocketConnection = (user) => {
    const userId = user._id || user.id;
    if (userId) socketService.connect(userId);
  };

  const handleAuthError = (error) => {
    console.error('Auth error:', error);
    let errorMessage = error.message;

    if (error.message.includes(',')) {
      errorMessage = error.message.split(', ').map((msg) => ({ msg }));
    } else if (error.message === 'This email is already registered') {
      errorMessage = [{ msg: 'This email is already registered' }];
    } else if (error.message.includes('Too many')) {
      errorMessage = [{ msg: error.message }];
    } else if (error.message.includes('Google login')) {
      errorMessage = [{ msg: error.message }];
    } else {
      errorMessage = [{ msg: errorMessage }];
    }

    setAuthState((prev) => ({
      ...prev,
      error: errorMessage,
      loading: false,
      needsFetch: false,
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
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('userDataTimestamp', Date.now().toString());
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
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('userDataTimestamp', Date.now().toString());
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

  const googleLoginUser = async () => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await googleLogin(); // Redirects to Google OAuth
    } catch (err) {
      handleAuthError(err);
      throw err;
    }
  };

  const registerUser = async (userData) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const newUser = await register(userData.name, userData.email, userData.password);
      localStorage.setItem('userData', JSON.stringify(newUser));
      localStorage.setItem('userDataTimestamp', Date.now().toString());
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
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('userDataTimestamp', Date.now().toString());
      setAuthState((prev) => ({
        ...prev,
        user: userData || prev.user,
        loading: false,
        needsFetch: false,
      }));
      if (userData) setupSocketConnection(userData);
      return userData;
    } catch (err) {
      handleAuthError(err);
      throw err;
    }
  };

  const updateUserProfile = async (userData) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const updatedUser = await updateUser(userData);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      localStorage.setItem('userDataTimestamp', Date.now().toString());
      setAuthState({
        user: updatedUser,
        loading: false,
        error: null,
        needsFetch: false,
      });
      setupSocketConnection(updatedUser);
      return updatedUser;
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
      googleLoginUser,
      registerUser,
      logoutUser,
      refreshUserToken,
      fetchUser,
      updateUser: updateUserProfile,
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