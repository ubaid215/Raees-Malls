// 📁 pages/Profile.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../core/Button';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate(user?.role === 'admin' ? '/admin/login' : '/login');
  };

  // Handle navigation based on role
  const handleRoleAction = () => {
    if (user?.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/products');
    }
  };

  if (!user) return null; // Render nothing while redirecting

  return (
    <div className="max-w-3xl mx-auto mt-12 p-6 bg-white rounded-lg shadow-md animate-fadeIn">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        {user.role === 'admin' ? 'Admin Profile' : 'My Profile'}
      </h2>

      {/* User Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <p className="mt-1 text-lg text-gray-900">{user.name}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-lg text-gray-900">{user.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <p className="mt-1 text-lg text-gray-900 capitalize">{user.role}</p>
        </div>
      </div>

      {/* Role-Specific Content */}
      <div className="mb-6">
        {user.role === 'admin' ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Admin Overview</h3>
            <p className="text-sm text-gray-600">
              Manage your e-commerce platform from here. Add products, update banners, and oversee user activity.
            </p>
            {/* Placeholder for admin stats - expand later */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-xl font-bold text-gray-900">Coming Soon</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-xl font-bold text-gray-900">Coming Soon</p>
              </div>
            </div>
            <Button
              onClick={handleRoleAction}
              variant="primary"
              className="w-full bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
            >
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">User Dashboard</h3>
            <p className="text-sm text-gray-600">
              View your shopping activity and manage your account here.
            </p>
            {/* Placeholder for user data - expand later */}
            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="text-sm text-gray-600">Recent Orders</p>
                <p className="text-gray-900">No orders yet. Start shopping!</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="text-sm text-gray-600">Your Reviews</p>
                <p className="text-gray-900">No reviews submitted yet.</p>
              </div>
            </div>
            <Button
              onClick={handleRoleAction}
              variant="primary"
              className="w-full bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
            >
              Shop Now
            </Button>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <Button
        onClick={handleLogout}
        variant="secondary"
        className="w-full bg-gray-600 text-white hover:bg-gray-700 transition-all duration-300"
      >
        Logout
      </Button>
    </div>
  );
};

export default Profile;