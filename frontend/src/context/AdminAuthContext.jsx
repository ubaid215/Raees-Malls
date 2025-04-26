import { createContext, useState, useEffect, useContext } from 'react';
import { adminLogin, getAdminSession, adminLogout, adminChangePassword } from '../services/api';
import { AuthContext } from '../context/AuthContext';

export const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
  const authContext = useContext(AuthContext);
  const user = authContext ? authContext.user : null;
  const [admin, setAdmin] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAdminAuth = async () => {
      const adminToken = localStorage.getItem('adminToken');
      if (adminToken && !user) {
        try {
          const { data } = await getAdminSession();
          setAdmin(data.user);
          setIsAdminAuthenticated(true);
        } catch (err) {
          console.error('Admin session initialization failed:', err);
          localStorage.removeItem('adminToken');
        }
      }
      setLoading(false);
    };
    initializeAdminAuth();
  }, [user]);

  const loginAdmin = async (credentials) => {
    try {
      const { data } = await adminLogin(credentials);
      console.log('adminLogin response:', data);
      console.log('adminLogin response.data:', data.data);
      const token = data.data?.user?.token || data.data?.token || data.user?.token || data.token;
      if (!token) {
        throw new Error('No token found in response. Expected token in data.user.token or data.token.');
      }
      localStorage.setItem('adminToken', token);
      const adminData = await getAdminSession();
      setAdmin(adminData.data.user);
      setIsAdminAuthenticated(true);
      return { success: true };
    } catch (err) {
      console.error('Admin login failed:', err);
      return { success: false, error: err.response?.data?.message || err.message || 'Admin login failed' };
    }
  };

  const logoutAdmin = async () => {
    try {
      await adminLogout();
      localStorage.removeItem('adminToken');
      setAdmin(null);
      setIsAdminAuthenticated(false);
    } catch (err) {
      console.error('Admin logout failed:', err);
    }
  };

  const changeAdminPassword = async (passwordData) => {
    try {
      await adminChangePassword(passwordData);
      return { success: true };
    } catch (err) {
      console.error('Admin password change failed:', err);
      return { success: false, error: err.response?.data?.message || 'Password change failed' };
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAdminAuthenticated,
        loading,
        loginAdmin,
        logoutAdmin,
        changeAdminPassword,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};