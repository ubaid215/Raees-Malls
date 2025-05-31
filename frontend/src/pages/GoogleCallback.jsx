// frontend/GoogleCallback.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;

    const handleCallback = async () => {
      try {
        console.log('GoogleCallback: Processing callback', location.search);
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const refreshToken = params.get('refreshToken');
        const userId = params.get('userId');
        const error = params.get('error');

        if (error) {
          console.error('GoogleCallback: Error in query params', error);
          throw new Error(decodeURIComponent(error));
        }

        if (!token || !refreshToken || !userId) {
          console.error('GoogleCallback: Missing parameters', { token, refreshToken, userId });
          throw new Error('Missing or invalid authentication parameters');
        }

        // Store tokens even if fetchUser fails
        localStorage.setItem('userToken', token);
        localStorage.setItem('userRefreshToken', refreshToken);
        localStorage.setItem('userId', userId);

        try {
          await fetchUser();
          console.log('GoogleCallback: User fetched successfully');
        } catch (fetchError) {
          console.warn('GoogleCallback: fetchUser failed, retrying later', fetchError);
          // Allow navigation to proceed; retry fetchUser in AuthProvider
        }

        hasProcessed.current = true;
        navigate('/account', { replace: true });
      } catch (err) {
        console.error('GoogleCallback error:', err.message, err);
        hasProcessed.current = true;
        navigate('/login', { state: { error: err.message || 'Google login failed' } });
      }
    };

    handleCallback();
  }, [navigate, fetchUser, location.search]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p className="mt-4 text-gray-600">Processing Google login...</p>
      </div>
    </div>
  );
};

export default GoogleCallback;