/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { registerUser, googleLoginUser } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!email) newErrors.email = 'Email is required';
    else if (!emailRegex.test(email)) newErrors.email = 'Invalid email format';

    if (!password) newErrors.password = 'Password is required';
    else if (!passwordRegex.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase, one lowercase, one number, and one special character';
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
      await registerUser({ name, email, password });
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      if (Array.isArray(err.error)) {
        const backendErrors = err.error.reduce((acc, { msg }) => {
          if (msg.includes('email')) acc.email = msg;
          else if (msg.includes('password')) acc.password = msg;
          else if (msg.includes('name')) acc.name = msg;
          else acc.general = msg;
          return acc;
        }, {});
        setErrors(backendErrors);
      } else {
        setErrors({ general: err.message || 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setErrors({});
    setLoading(true);
    try {
      console.log('Register: Initiating Google sign-up');
      await googleLoginUser();
      console.log('Register: Google sign-up initiated, expecting redirect');
    } catch (err) {
      console.error('Google sign-up error:', err);
      setErrors({ general: err.message || 'Google sign-up failed. Please try again.' });
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Sign Up</h2>
        </div>

        {errors.general && (
          <div className="mb-4 p-2 bg-red-50 text-red-700 rounded-lg text-center border border-red-200">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={`w-full px-3 py-2 border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              placeholder="Enter your full name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              placeholder="your@email.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full px-3 py-2 border ${errors.password ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10`}
              placeholder="Create a password"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-9 text-gray-400 hover:text-indigo-600 transition"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
            </button>
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-200 flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Signing Up...
              </>
            ) : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className={`w-full py-2 px-4 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition duration-200 flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <FcGoogle size={20} className="mr-2" />
            {loading ? 'Processing...' : 'Sign Up with Google'}
          </button>
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;