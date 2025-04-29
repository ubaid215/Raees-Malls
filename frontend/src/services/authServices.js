import api from './api';

// User authentication services
export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
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
    console.error('Login error:', error.response?.data, error.message);
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers['retry-after'] || '30';
      throw new Error(`Too many login attempts. Please try again in ${retryAfter} seconds.`);
    }
    throw new Error(error.response?.data?.message || error.message || 'Login failed');
  }
};

export const register = async (name, email, password) => {
  try {
    const response = await api.post('/auth/register', { name, email, password });
    console.log('Register response:', response.data);
    const { success, data } = response.data;
    
    if (!success || !data?.tokens?.accessToken || !data?.user) {
      console.error('Invalid response data:', response.data);
      throw new Error('Invalid response: Missing token or user data');
    }

    const { accessToken, refreshToken } = data.tokens;
    const user = data.user;
    const userId = user._id || user.id;
    
    if (!userId) {
      throw new Error('Invalid response: Missing user ID');
    }

    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', userId);
    
    return user;
  } catch (error) {
    console.error('Register error:', error.response?.data, error.message);
    throw new Error(error.response?.data?.message || error.message || 'Registration failed');
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
    
    return data.user || null;
  } catch (error) {
    console.error('Refresh token error:', error.response?.data, error.message);
    // Clear tokens if refresh fails
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    throw new Error(error.response?.data?.message || error.message || 'Token refresh failed');
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
    // Ensure we clear local storage even if logout fails
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    throw new Error(error.response?.data?.message || error.message || 'Logout failed');
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
    
    // Cache user data with timestamp
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
      throw new Error(`Too many requests. Please try again in ${retryAfter} seconds.`);
    }
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch user details');
  }
};