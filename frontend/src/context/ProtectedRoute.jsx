import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/core/LoadingSpinner';

const ProtectedRoute = ({ children, roles = ['user'] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();


  if (loading) {
    console.log('ProtectedRoute: Loading customer auth state');
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has any of the required roles
  if (!roles.includes(user?.role)) {
    const redirectPath = ['admin'].includes(user?.role) ? '/' : '/login';
    // console.log(`ProtectedRoute: Role ${user?.role} not allowed, redirecting to ${redirectPath}`);
    return <Navigate to={redirectPath} replace />;
  }

  console.log('ProtectedRoute: Access granted');
  return children;
};

export default ProtectedRoute;