import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const AdminLogin = () => {
  const {
    admin,
    isAdminAuthenticated,
    loading: authLoading,
    error: authError,
    isRateLimited,
    retryAfter,
    loginAdmin,
  } = useAdminAuth();

  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAdminAuthenticated) {
      console.log('Redirecting authenticated admin');
      navigate('/admin', { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  // Handle rate limiting
  useEffect(() => {
    let timer;
    if (isRateLimited && retryAfter) {
      const delay = parseInt(retryAfter, 10) * 1000 || 30000;
      console.log('Rate limited, waiting for:', delay, 'ms');
      timer = setTimeout(() => {
        console.log('Rate limit timeout expired');
      }, delay);
    }
    return () => clearTimeout(timer);
  }, [isRateLimited, retryAfter]);

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      return 'Both email and password are required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isRateLimited) return;

    setLocalError('');
    setIsSubmitting(true);

    const validationError = validateForm();
    if (validationError) {
      console.log('Client-side validation failed:', validationError);
      setLocalError(validationError);
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('Attempting login with:', formData.email);
      await loginAdmin(formData);
      console.log('Login successful - redirecting');
    } catch (err) {
      console.error('Login failed:', err);
      setLocalError(err.message || 'Admin login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E63946]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-[#E63946] mb-6">Admin Login</h2>

        {(localError || authError) && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md">
            {localError || authError}
          </div>
        )}

        {isRateLimited && retryAfter && (
          <p className="mb-4 text-gray-600">Please wait {retryAfter} seconds before retrying.</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@example.com"
              required
              disabled={isSubmitting || authLoading || isRateLimited}
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E63946] disabled:bg-gray-100"
              autoComplete="admin-email"
            />
          </div>

          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
              disabled={isSubmitting || authLoading || isRateLimited}
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E63946] disabled:bg-gray-100"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
              disabled={isSubmitting || authLoading || isRateLimited}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || authLoading || isRateLimited}
            className={`w-full py-2 px-4 rounded-md transition-colors ${
              isSubmitting || authLoading || isRateLimited
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#E63946] text-white hover:bg-[#d62c3a]'
            }`}
          >
            {isSubmitting ? 'Authenticating...' : isRateLimited ? `Please Wait (${retryAfter || '30'}s)` : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;