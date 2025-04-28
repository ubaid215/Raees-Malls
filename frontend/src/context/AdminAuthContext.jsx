import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { adminLogin, adminLogout, getSession } from '../services/authServices';
import socketService from '../services/socketService';

// Create and export the context as a named export
export const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const adminToken = localStorage.getItem('adminToken');

    const initializeAuth = async () => {
      if (!adminToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const adminData = await getSession();
        if (isMounted) {
          setAdmin(adminData);
          socketService.connect(adminData._id, 'admin');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          localStorage.removeItem('adminToken');
          localStorage.removeItem('userId');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const loginAdmin = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const adminData = await adminLogin(email, password);
      setAdmin(adminData);
      socketService.connect(adminData._id, 'admin');
      return adminData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logoutAdmin = async () => {
    setLoading(true);
    try {
      await adminLogout();
      setAdmin(null);
      socketService.disconnect();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const contextValue = useMemo(() => ({
    admin,
    loading,
    error,
    isAdminAuthenticated: !!admin,
    loginAdmin,
    logoutAdmin
  }), [admin, loading, error]);

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};