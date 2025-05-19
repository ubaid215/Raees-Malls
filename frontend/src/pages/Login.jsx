import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { loginUser, googleLoginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      await loginUser({ email, password });
      const from = location.state?.from || '/account';
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      if (err.message.includes('Too many login attempts')) {
        setIsRateLimited(true);
        setErrors({ general: err.message });
        setTimeout(() => setIsRateLimited(false), 30000);
      } else if (err.message.includes('Invalid email or password')) {
        setErrors({ general: 'Invalid email or password' });
      } else if (err.message.includes('Please use Google to log in')) {
        setErrors({ general: 'This account uses Google login. Please use the Google login option.' });
      } else if (Array.isArray(err.error)) {
        const backendErrors = err.error.reduce((acc, { msg }) => {
          if (msg.includes('email')) acc.email = msg;
          else if (msg.includes('password')) acc.password = msg;
          else acc.general = msg;
          return acc;
        }, {});
        setErrors(backendErrors);
      } else {
        setErrors({ general: err.message || 'Failed to log in' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrors({});
    setLoading(true);
    try {
      await googleLoginUser();
      // Note: The user will be redirected to Google OAuth, and the callback will handle navigation
    } catch (err) {
      console.error('Google login error:', err);
      setErrors({ general: err.message || 'Google login failed. Please try again.' });
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    let timer;
    if (isRateLimited) {
      timer = setTimeout(() => setIsRateLimited(false), 30000);
    }
    return () => clearTimeout(timer);
  }, [isRateLimited]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Login</h2>
          <p className="text-gray-600 text-sm">Please enter your credentials</p>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-center border border-red-200">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-3 py-2 border ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder="Enter your email"
              disabled={isRateLimited || loading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full px-3 py-2 border ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10`}
              placeholder="Enter your password"
              disabled={isRateLimited || loading}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={isRateLimited || loading}
            >
              {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
            </button>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || isRateLimited}
            className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition ${
              loading || isRateLimited ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging In...
              </>
            ) : isRateLimited ? (
              'Please Wait...'
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading || isRateLimited}
            className={`w-full py-2 px-4 bg-white text-gray-700 border border-gray-300 rounded-md font-medium hover:bg-gray-50 transition flex items-center justify-center ${
              loading || isRateLimited ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <FcGoogle size={20} className="mr-2" />
            {loading ? 'Processing...' : 'Login with Google'}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-medium hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;