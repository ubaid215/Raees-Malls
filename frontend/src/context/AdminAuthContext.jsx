import React, { createContext, useState, useContext, useMemo, useEffect, useRef } from 'react';
import AdminAuthService from '../services/adminAuthService';
import socketService from '../services/socketService';
import API from '../services/api';

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

  const initializationRef = useRef(false);
  const verificationTimeoutRef = useRef(null);

  useEffect(() => {
  if (initializationRef.current) return;
  initializationRef.current = true;

  const initializeAuth = async () => {
    const adminToken = localStorage.getItem('adminToken');
    const adminRefreshToken = localStorage.getItem('adminRefreshToken');

    if (!adminToken && !adminRefreshToken) {
      setAuthState(prev => ({ ...prev, loading: false, isAdminAuthenticated: false }));
      return;
    }

    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      const response = await API.get('/admin/verify-token', { withCredentials: true });
      const { user } = response.data.data;

      setAuthState(prev => ({
        ...prev,
        admin: user,
        isAdminAuthenticated: true,
        loading: false
      }));

      setupSocketConnection(user);
      scheduleTokenVerification();
    } catch (err) {
      console.error('Auth Init Failed:', err);
      resetAuthState();
    }
  };

  initializeAuth();

  return () => {
    clearTimeout(verificationTimeoutRef.current);
  };
}, []);


  const scheduleTokenVerification = () => {
    // Clear existing timeout
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
    }
    
    // Schedule next verification in 10 minutes
    verificationTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await API.get('/admin/verify-token', {
          withCredentials: true
        });
        const { user } = response.data.data;
        
        setAuthState(prev => ({
          ...prev,
          admin: user,
          isAdminAuthenticated: true
        }));
        
        // Schedule next verification
        scheduleTokenVerification();
      } catch (err) {
        console.error('Periodic token verification failed:', err);
        // Don't reset auth state immediately, let user continue
        // The API interceptor will handle token refresh if needed
      }
    }, 10 * 60 * 1000); // 10 minutes
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
      resetAuthState();
    }
  };

  const resetAuthState = () => {
    // Clear periodic verification
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
      
      // Store tokens in localStorage for persistence
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
      });
      
      setupSocketConnection(adminData.user);
      scheduleTokenVerification(); // Start periodic verification
      
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
      // Even if logout API fails, clear local state
      resetAuthState();
      console.error('Logout API failed, but cleared local state:', err);
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const refreshAdminToken = async () => {
    setAuthState(prev => ({ ...prev, isRefreshingToken: true, loading: true }));
    try {
      const adminData = await AdminAuthService.refreshToken();
      
      // Update tokens in localStorage
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
      }));
      
      setupSocketConnection(adminData.user);
      scheduleTokenVerification(); // Restart periodic verification
      
      return adminData;
    } catch (err) {
      handleAuthError(err);
      throw err;
    } finally {
      setAuthState(prev => ({ ...prev, isRefreshingToken: false, loading: false }));
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