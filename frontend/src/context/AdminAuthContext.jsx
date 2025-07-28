import React, { createContext, useState, useContext, useMemo, useEffect, useRef } from 'react';
import AdminAuthService from '../services/adminAuthService';
import socketService from '../services/socketService';
import API from '../services/api';

const AdminAuthContext = createContext();

const AdminAuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    admin: null,
    loading: true,
    error: null,
    errors: [],
    isRateLimited: false,
    retryAfter: null,
    isRefreshingToken: false,
    isAdminAuthenticated: false,
    isInitialized: false,
  });

  const initializationRef = useRef(false);
  const verificationTimeoutRef = useRef(null);
  const refreshQueueRef = useRef([]);
  const lastVerificationRef = useRef(0);
  const MIN_VERIFICATION_INTERVAL = 30 * 1000; // 30 seconds minimum between verifications
  const VERIFICATION_INTERVAL = 10 * 60 * 1000; // 10 minutes for periodic verification

  // Debounce function to limit refresh calls
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      return new Promise((resolve) => {
        timeout = setTimeout(() => resolve(func(...args)), wait);
      });
    };
  };

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initializeAuth = async () => {
      const adminToken = localStorage.getItem('adminToken');
      const adminRefreshToken = localStorage.getItem('adminRefreshToken');

      if (!adminToken && !adminRefreshToken) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          isAdminAuthenticated: false,
          isInitialized: true
        }));
        return;
      }

      try {
        await verifyToken();
      } catch (err) {
        console.error('Auth Init Failed:', err);
        resetAuthState(true);
      }
    };

    initializeAuth();

    return () => {
      clearTimeout(verificationTimeoutRef.current);
      refreshQueueRef.current = [];
    };
  }, []);

  const verifyToken = async () => {
    const now = Date.now();
    if (now - lastVerificationRef.current < MIN_VERIFICATION_INTERVAL) {
      return; // Skip if called too recently
    }

    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      const response = await API.get('/admin/verify-token', { withCredentials: true });
      const { user } = response.data.data;
      lastVerificationRef.current = now;

      setAuthState(prev => ({
        ...prev,
        admin: user,
        isAdminAuthenticated: true,
        loading: false,
        isInitialized: true,
        error: null,
        errors: []
      }));

      setupSocketConnection(user);
      scheduleTokenVerification();
    } catch (err) {
      throw err;
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const scheduleTokenVerification = () => {
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
    }

    verificationTimeoutRef.current = setTimeout(async () => {
      try {
        await verifyToken();
      } catch (err) {
        console.error('Periodic token verification failed:', err);
        // Rely on refresh token mechanism instead of immediate logout
        debouncedRefreshToken();
      }
    }, VERIFICATION_INTERVAL);
  };

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
      resetAuthState(true);
    }
  };

  const resetAuthState = (isInitialized = false) => {
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
      verificationTimeoutRef.current = null;
    }

    setAuthState({
      admin: null,
      loading: false,
      error: null,
      errors: [],
      isRateLimited: false,
      retryAfter: null,
      isRefreshingToken: false,
      isAdminAuthenticated: false,
      isInitialized,
    });

    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');

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
      
      localStorage.setItem('adminToken', adminData.token);
      localStorage.setItem('adminRefreshToken', adminData.refreshToken);
      
      setAuthState({
        admin: adminData.user,
        loading: false,
        error: null,
        errors: [],
        isRateLimited: false,
        retryAfter: null,
        isRefreshingToken: false,
        isAdminAuthenticated: true,
        isInitialized: true,
      });
      
      setupSocketConnection(adminData.user);
      scheduleTokenVerification();
      
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
      resetAuthState(true);
    } catch (err) {
      resetAuthState(true);
      console.error('Logout API failed, but cleared local state:', err);
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const refreshAdminToken = async () => {
    if (authState.isRateLimited) {
      return new Promise((resolve, reject) => {
        refreshQueueRef.current.push({ resolve, reject });
      });
    }

    setAuthState(prev => ({ ...prev, isRefreshingToken: true, loading: true }));
    try {
      const adminData = await AdminAuthService.refreshToken();
      
      localStorage.setItem('adminToken', adminData.token);
      localStorage.setItem('adminRefreshToken', adminData.refreshToken);
      
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
        isInitialized: true,
      }));
      
      setupSocketConnection(adminData.user);
      scheduleTokenVerification();
      
      // Resolve all queued refresh requests
      refreshQueueRef.current.forEach(({ resolve }) => resolve(adminData));
      refreshQueueRef.current = [];
      
      return adminData;
    } catch (err) {
      refreshQueueRef.current.forEach(({ reject }) => reject(err));
      refreshQueueRef.current = [];
      handleAuthError(err);
      throw err;
    } finally {
      setAuthState(prev => ({ ...prev, isRefreshingToken: false, loading: false }));
    }
  };

  const debouncedRefreshToken = debounce(refreshAdminToken, 1000);

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
      refreshAdminToken: debouncedRefreshToken,
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