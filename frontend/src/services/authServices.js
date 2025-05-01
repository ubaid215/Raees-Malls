import api from './api';
import * as yup from 'yup';

// Validation schemas
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
    .email('Invalid email format'),
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
    .email('Invalid email format'),
  password: yup.string().required('Password is required'),
});

export const login = async (email, password) => {
  try {
    // Validate input
    const credentials = await loginSchema.validate(
      { email, password },
      { abortEarly: false }
    );

    const response = await api.post('/auth/login', credentials);
    console.log('Login response:', response.data);
    const { success, data } = response.data;

    if (!success || !data?.tokens?.accessToken || !data?.user?._id) {
      console.error('Invalid response data:', response.data);
      throw new Error('Invalid response from server');
    }

    const { accessToken, refreshToken } = data.tokens;
    const user = data.user;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', user._id);

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
    throw new Error(
      error.response?.data?.message || error.message || 'Login failed'
    );
  }
};

export const register = async (name, email, password) => {
  try {
    // Validate input
    const userData = await registerSchema.validate(
      { name, email, password },
      { abortEarly: false }
    );

    const response = await api.post('/auth/register', userData);
    console.log('Register response:', response.data);

    const { success, data } = response.data;

    if (!success || !data?.tokens?.accessToken || !data?.user) {
      throw new Error('Invalid response: Missing token or user data');
    }

    const { accessToken, refreshToken } = data.tokens;
    const userId = data.user._id || data.user.id;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', userId);

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
      errorData?.message || error.message || 'Registration failed';
    console.error('Registration Error:', errorMessage);

    // Handle specific backend errors (e.g., duplicate email)
    if (errorData?.message === 'Email already in use') {
      throw new Error('This email is already registered');
    }

    throw new Error(errorMessage);
  }
};

export const refreshToken = async () => {// Validation schemas
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

export const login = async (email, password) => {
  try {
    // Validate input
    const credentials = await loginSchema.validate(
      { email, password },
      { abortEarly: false }
    );

    const response = await api.post('/auth/login', credentials);
    console.log('Login response:', response.data);
    const { success, data } = response.data;

    if (!success || !data?.tokens?.accessToken || !data?.user?._id) {
      console.error('Invalid response data:', response.data);
      throw new Error('Invalid response from server');
    }

    const { accessToken, refreshToken } = data.tokens;
    const user = data.user;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', user._id);

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
    throw new Error(
      error.response?.data?.message || error.message || 'Login failed'
    );
  }
};

export const register = async (name, email, password) => {
  try {
    // Validate input
    const userData = await registerSchema.validate(
      { name, email, password },
      { abortEarly: false }
    );

    const response = await api.post('/auth/register', userData);
    console.log('Register response:', response.data);

    const { success, data } = response.data;

    if (!success || !data?.tokens?.accessToken || !data?.user) {
      throw new Error('Invalid response: Missing token or user data');
    }

    const { accessToken, refreshToken } = data.tokens;
    const userId = data.user._id || data.user.id;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', userId);

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
      errorData?.message || error.message || 'Registration failed';
    console.error('Registration Error:', errorMessage);

    // Handle specific backend errors (e.g., duplicate email)
    if (errorData?.message === 'Email already in use') {
      throw new Error('This email is already registered');
    }

    throw new Error(errorMessage);
  }
};

export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh-token', { refreshToken });
    console.log('Refresh token response:', response.data);
    const { success, data } = response.data;

    if (!success || !data?.tokens?.accessToken) {
      console.error('Invalid refresh response:', response.data);
      throw new Error('Invalid response: Missing access token');
    }

    const { accessToken, refreshToken: newRefreshToken } = data.tokens;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);

    // Also store the new expiration time if available
    if (data.tokens.expiresIn) {
      localStorage.setItem('tokenExpiry', Date.now() + data.tokens.expiresIn * 1000);
    }

    return data.user || null;
  } catch (error) {
    console.error('Refresh token error:', error.response?.data, error.message);
    // Don't remove tokens here - let the AuthContext handle it
    throw new Error(
      error.response?.data?.message || error.message || 'Token refresh failed'
    );
  }
};

export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
  } catch (error) {
    console.error('Logout error:', error.response?.data, error.message);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    throw new Error(
      error.response?.data?.message || error.message || 'Logout failed'
    );
  }
};

export const getMe = async () => {
  try {
    const response = await api.get('/auth/me');
    console.log('GetMe response:', response.data);
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
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to fetch user details'
    );
  }
};
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh-token', { refreshToken });
    console.log('Refresh token response:', response.data);
    const { success, data } = response.data;

    if (!success || !data?.tokens?.accessToken) {
      console.error('Invalid refresh response:', response.data);
      throw new Error('Invalid response: Missing access token');
    }

    const { accessToken, refreshToken: newRefreshToken } = data.tokens;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);

    // Also store the new expiration time if available
    if (data.tokens.expiresIn) {
      localStorage.setItem('tokenExpiry', Date.now() + data.tokens.expiresIn * 1000);
    }

    return data.user || null;
  } catch (error) {
    console.error('Refresh token error:', error.response?.data, error.message);
    // Don't remove tokens here - let the AuthContext handle it
    throw new Error(
      error.response?.data?.message || error.message || 'Token refresh failed'
    );
  }
};

export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
  } catch (error) {
    console.error('Logout error:', error.response?.data, error.message);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    throw new Error(
      error.response?.data?.message || error.message || 'Logout failed'
    );
  }
};

export const getMe = async () => {
  try {
    const response = await api.get('/auth/me');
    console.log('GetMe response:', response.data);
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
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to fetch user details'
    );
  }
};