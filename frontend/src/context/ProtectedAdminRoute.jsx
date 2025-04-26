import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AdminAuthContext } from '../context/AdminAuthContext';

const ProtectedAdminRoute = () => {
  const { isAdminAuthenticated, loading } = useContext(AdminAuthContext);

  if (loading) return <div>Loading...</div>;
  return isAdminAuthenticated ? <Outlet /> : <Navigate to="/admin/login" />;
};

export default ProtectedAdminRoute;