import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import AdminAuthService from '../services/adminAuthService';
import socketService from '../services/socketService';

const AdminAuthContext = createContext();

const AdminAuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    admin: null,
    loading: false,
    error: null,
    errors: [],
    isRateLimited: false,
    retryAfter: null,
    isRefreshingToken: false,
    isAdminAuthenticated: false,
  });

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('adminToken');
      const refreshToken = localStorage.getItem('refreshToken');
      if (token && refreshToken) {
        setAuthState(prev => ({ ...prev, loading: true }));
        try {
          await refreshAdminToken();
        } catch (err) {
          console.error('Token validation failed during initialization:', err);
          resetAuthState();
        } finally {
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    initializeAuth();
  }, []);

  const setupSocketConnection = (admin) => {
    const adminId = admin?._id || admin?.userId;
    if (adminId) {
      try {
        socketService.connect(adminId, 'admin');
      } catch (err) {
        console.error('Failed to setup socket connection:', err);
        setAuthState(prev => ({
          ...prev,
          error: 'Socket connection failed',
          errors: [err.message],
        }));
      }
    }
  };

  const handleAuthError = (error) => {
    console.error('Admin auth error:', error);
    const isRateLimitError = error.status === 429 || error.message.includes('Too many requests');
    const retryAfter = error.retryAfter || null;

    setAuthState(prev => ({
      ...prev,
      error: error.message,
      errors: error.errors || [],
      isRateLimited: isRateLimitError,
      retryAfter: isRateLimitError ? retryAfter : null,
    }));

    if (!isRateLimitError) {
      resetAuthState();
    }
  };

  const resetAuthState = () => {
    setAuthState({
      admin: null,
      loading: false,
      error: null,
      errors: [],
      isRateLimited: false,
      retryAfter: null,
      isRefreshingToken: false,
      isAdminAuthenticated: false,
    });
    localStorage.removeItem('adminToken');
    localStorage.removeItem('refreshToken');
    try {
      socketService.disconnect();
    } catch (err) {
      console.error('Failed to disconnect socket:', err);
    }
  };

  const loginAdmin = async (credentials) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null, errors: [] }));
    try {
      const adminData = await AdminAuthService.login(credentials);
      setAuthState({
        admin: adminData.user,
        loading: false,
        error: null,
        errors: [],
        isRateLimited: false,
        retryAfter: null,
        isRefreshingToken: false,
        isAdminAuthenticated: true,
      });
      setupSocketConnection(adminData.user);
      return adminData;
    } catch (err) {
      handleAuthError(err);
      throw err;
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const logoutAdmin = async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    try {
      await AdminAuthService.logout();
      resetAuthState();
    } catch (err) {
      handleAuthError(err);
      throw err;
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const refreshAdminToken = async () => {
    setAuthState(prev => ({ ...prev, isRefreshingToken: true, loading: true }));
    try {
      const adminData = await AdminAuthService.refreshToken();
      setAuthState(prev => ({
        ...prev,
        admin: adminData.user,
        isRefreshingToken: false,
        loading: false,
        error: null,
        errors: [],
        isRateLimited: false,
        retryAfter: null,
        isAdminAuthenticated: true,
      }));
      setupSocketConnection(adminData.user);
      return adminData;
    } catch (err) {
      handleAuthError(err);
      throw err;
    } finally {
      setAuthState(prev => ({ isRefreshingToken: false, loading: false }));
    }
  };

  const changeAdminPassword = async (currentPassword, newPassword, confirmPassword) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null, errors: [] }));
    try {
      const result = await AdminAuthService.changeAdminPassword(currentPassword, newPassword, confirmPassword);
      setAuthState(prev => ({ ...prev, loading: false }));
      return result;
    } catch (err) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: err.message,
        errors: err.errors || [],
      }));
      throw err;
    }
  };

  const isAuthenticated = authState.isAdminAuthenticated && authState.admin;

  const contextValue = useMemo(
    () => ({
      ...authState,
      isAdminAuthenticated: isAuthenticated,
      loginAdmin,
      logoutAdmin,
      refreshAdminToken,
      resetAuthState,
      changeAdminPassword,
    }),
    [authState, isAuthenticated]
  );

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
};

const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export { AdminAuthProvider, useAdminAuth };
export default AdminAuthContext;