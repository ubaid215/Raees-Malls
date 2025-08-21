import api from './api';
import * as yup from 'yup';

// Validation schemas unchanged
const registerSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters'),
  email: yup
    .string()
    .trim()
    .required('Email is required')
    .email('Invalid email format')
    .lowercase('Email must be in lowercase'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});

const loginSchema = yup.object().shape({
  email: yup
    .string()
    .trim()
    .required('Email is required')
    .email('Invalid email format')
    .lowercase('Email must be in lowercase'),
  password: yup.string().required('Password is required'),
});

const updateProfileSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters'),
  email: yup
    .string()
    .trim()
    .required('Email is required')
    .email('Invalid email format')
    .lowercase('Email must be in lowercase'),
  addresses: yup
    .array()
    .of(
      yup.object().shape({
        street: yup.string().trim().required('Street is required'),
        city: yup.string().trim().required('City is required'),
        state: yup.string().trim().required('State is required'),
        zip: yup.string().trim().required('Zip code is required'),
        country: yup.string().trim().required('Country is required'),
      })
    )
    .optional(),
});

const getBaseUrl = () => {
  // Robust environment detection
  const isProduction = window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  return isProduction
    ? (import.meta.env.VITE_API_BASE_PROD_URL || 'https://api.raeesmalls.com')
    : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
};

// Helper function to store tokens consistently
const storeTokens = (accessToken, refreshToken, userId) => {
  localStorage.setItem('userToken', accessToken);
  localStorage.setItem('userRefreshToken', refreshToken);
  localStorage.setItem('userId', userId);
};

// Helper function to clear all stored data
const clearStoredData = () => {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userRefreshToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('userData');
  localStorage.removeItem('userDataTimestamp');
  localStorage.removeItem('tokenExpiry');
};

export const login = async (email, password) => {
  try {
    const credentials = await loginSchema.validate({ email, password }, { abortEarly: false });
    const response = await api.post('/auth/login', credentials, { withCredentials: true });
    const { success, data } = response.data;

    const accessToken = data?.token;
    const refreshToken = data?.refreshToken;
    const user = data?.user;

    if (!success || !accessToken || !user?._id) {
      throw new Error('Invalid response from server');
    }

    storeTokens(accessToken, refreshToken, user._id);
    return user;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors = error.inner.map((err) => err.message).join(', ');
      console.error('Validation Errors:', errors);
      throw new Error(errors);
    }
    console.error('Login error:', error.response?.data, error.message);
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers['retry-after'] || '30';
      throw new Error(
        `Too many login attempts. Please try again in ${retryAfter} seconds.`
      );
    }
    if (error.response?.data?.message === 'Please use Google to log in') {
      throw new Error('This account uses Google login. Please use the Google login option.');
    }
    throw new Error(
      error.response?.data?.message || error.message || 'Login failed'
    );
  }
};

export const googleLogin = async (authCode = null) => {
  try {
    const baseUrl = getBaseUrl();
    if (authCode) {
      // console.log('GoogleLogin: Processing auth code', authCode);
      const response = await api.post('/auth/google/callback', {
        code: authCode,
        redirect_uri: window.location.origin
      }, { withCredentials: true });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Google authentication failed');
      }

      const { token, refreshToken, user } = response.data.data;
      storeTokens(token, refreshToken, user._id || user.id);
      return user;
    } else {
      const redirectUrl = `${baseUrl}/api/auth/google?redirect_uri=${encodeURIComponent(window.location.origin)}`;
      // console.log('GoogleLogin: Redirecting to', redirectUrl);
      window.location.href = redirectUrl;
      return null;
    }
  } catch (error) {
    console.error('Google login error:', error.response?.data, error.message);
    throw new Error(
      error.response?.data?.message || error.message || 'Google login failed'
    );
  }
};

// Function to handle Google OAuth redirect
export const handleGoogleRedirect = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');
  const state = urlParams.get('state');

  if (error) {
    console.error('Google OAuth error:', error);
    throw new Error(`Google login failed: ${error}`);
  }

  if (code) {
    // console.log('Google redirect detected with auth code');
    // Clean the URL to remove the code
    window.history.replaceState({}, document.title, window.location.pathname);
    return await googleLogin(code);
  }

  return null;
};

export const register = async (name, email, password) => {
  try {
    const userData = await registerSchema.validate(
      { name, email, password },
      { abortEarly: false }
    );

    const response = await api.post('/auth/register', userData);
    // console.log('Register response:', response.data);
    const { success, data } = response.data;

    const accessToken = data?.token;
    const refreshToken = data?.refreshToken;
    const user = data?.user;

    if (!success || !accessToken || !user) {
      console.error('Invalid response data:', response.data);
      throw new Error('Invalid response: Missing token or user data');
    }

    const userId = user._id || user.id;
    storeTokens(accessToken, refreshToken, userId);
    return user;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors = error.inner.map((err) => err.message).join(', ');
      console.error('Validation Errors:', errors);
      throw new Error(errors);
    }

    const errorData = error.response?.data;
    const validationErrors = errorData?.errors;

    if (Array.isArray(validationErrors) && validationErrors.length > 0) {
      const messages = validationErrors.map((e) => e.msg).join(', ');
      console.error('Backend Validation Errors:', messages);
      throw new Error(messages);
    }

    const errorMessage =
      errorData?.message || error.message || 'Registration failed';
    console.error('Registration Error:', errorMessage);

    if (errorData?.message === 'This email is already registered') {
      throw new Error('This email is already registered');
    }

    throw new Error(errorMessage);
  }
};

export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('userRefreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh-token', { refreshToken }, {
      withCredentials: true,
      skipAuth: true // Prevent infinite loop in axios interceptor
    });
    const { success, data } = response.data;

    const accessToken = data?.token;
    const newRefreshToken = data?.refreshToken;

    if (!success || !accessToken) {
      throw new Error('Invalid refresh response: Missing access token');
    }

    // Update stored tokens
    localStorage.setItem('userToken', accessToken);
    localStorage.setItem('userRefreshToken', newRefreshToken);

    return data.user || null;
  } catch (error) {
    console.error('Refresh token error:', error.response?.data, error.message);
    // Clear tokens on refresh failure
    clearStoredData();
    throw new Error(
      error.response?.data?.message || error.message || 'Token refresh failed'
    );
  }
};

export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('userRefreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }, { withCredentials: true });
    }
  } catch (error) {
    console.error('Logout error:', error.response?.data, error.message);
  } finally {
    // Always clear local storage regardless of server response
    clearStoredData();
  }
};

export const getMe = async () => {
  try {
    const response = await api.get('/auth/me');
    // console.log('GetMe response:', response.data);
    const { success, data } = response.data;

    if (!success || !data?.user) {
      console.error('Invalid response data:', response.data);
      throw new Error('Invalid response: Missing user data');
    }

    try {
      localStorage.setItem('userData', JSON.stringify(data.user));
      localStorage.setItem('userDataTimestamp', Date.now().toString());
    } catch (cacheErr) {
      console.warn('Failed to cache user data:', cacheErr);
    }

    return data.user;
  } catch (error) {
    console.error('GetMe error:', error.response?.data, error.message);
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers['retry-after'] || '30';
      throw new Error(
        `Too many requests. Please try again in ${retryAfter} seconds.`
      );
    }
    // If token is invalid, clear stored data
    if (error.response?.status === 401) {
      clearStoredData();
    }
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to fetch user details'
    );
  }
};

export const updateUser = async (userData) => {
  try {
    const validatedData = await updateProfileSchema.validate(userData, {
      abortEarly: false,
    });

    const response = await api.put('/auth/update-profile', validatedData);
    // console.log('Update user response:', response.data);
    const { success, data } = response.data;

    if (!success || !data?.user) {
      console.error('Invalid response data:', response.data);
      throw new Error('Invalid response: Missing user data');
    }

    try {
      localStorage.setItem('userData', JSON.stringify(data.user));
      localStorage.setItem('userDataTimestamp', Date.now().toString());
    } catch (cacheErr) {
      console.warn('Failed to cache user data:', cacheErr);
    }

    return data.user;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors = error.inner.map((err) => err.message).join(', ');
      console.error('Validation Errors:', errors);
      throw new Error(errors);
    }

    const errorData = error.response?.data;
    const validationErrors = errorData?.errors;

    if (Array.isArray(validationErrors) && validationErrors.length > 0) {
      const messages = validationErrors.map((e) => e.msg).join(', ');
      console.error('Backend Validation Errors:', messages);
      throw new Error(messages);
    }

    const errorMessage =
      errorData?.message || error.message || 'Failed to update profile';
    console.error('Update Profile Error:', errorMessage);

    if (errorData?.message === 'This email is already registered') {
      throw new Error('This email is already registered');
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers['retry-after'] || '30';
      throw new Error(
        `Too many requests. Please try again in ${retryAfter} seconds.`
      );
    }

    throw new Error(errorMessage);
  }
};