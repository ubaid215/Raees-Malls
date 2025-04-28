import api from './api';

// Cache implementation for admin
let cachedAdmin = null;
let activeAdminRequests = {};

// User login
export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    if (!token || !user?._id) {
      throw new Error('Invalid response from server');
    }
    localStorage.setItem('token', token);
    localStorage.setItem('userId', user._id);
    return user;
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
};

// User register
export const register = async (name, email, password) => {
  try {
    const response = await api.post('/auth/register', { name, email, password });
    console.log('Register response:', response.data); // Debug log
    const { token, user } = response.data;

    // Validate response
    if (!token || !user) {
      throw new Error('Invalid response: Missing token or user data');
    }

    // Handle different _id field names
    const userId = user._id || user.id;
    if (!userId) {
      throw new Error('Invalid response: Missing user ID');
    }

    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    return user;
  } catch (error) {
    throw new Error(error.message || 'Registration failed');
  }
};

// Refresh token
export const refreshToken = async () => {
  try {
    const response = await api.post('/auth/refresh-token');
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('userId', user._id);
    return user;
  } catch (error) {
    throw new Error(error.message || 'Token refresh failed');
  }
};

// User logout
export const logout = async () => {
  try {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  } catch (error) {
    throw new Error(error.message || 'Logout failed');
  }
};

// Get authenticated user
export const getMe = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data.user;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch user details');
  }
};

// Admin login
export const adminLogin = async (email, password) => {
  try {
    const response = await api.post('/admin/login', { email, password });
    const { token, user } = response.data;
    
    // Store tokens
    localStorage.setItem('adminToken', token);
    localStorage.setItem('userId', user._id);
    
    // Cache the admin data
    cachedAdmin = user;
    
    return user;
  } catch (error) {
    // Clear cache on failure
    cachedAdmin = null;
    throw new Error(error.message || 'Admin login failed');
  }
};

// Admin logout
export const adminLogout = async () => {
  try {
    await api.post('/admin/logout');
    
    // Clear storage and cache
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userId');
    cachedAdmin = null;
    
  } catch (error) {
    throw new Error(error.message || 'Admin logout failed');
  }
};

// Get admin session user
export const getSession = async () => {
  // Return cached data if available
  if (cachedAdmin) return cachedAdmin;
  
  // Deduplicate simultaneous requests
  if (activeAdminRequests.session) {
    return activeAdminRequests.session;
  }

  try {
    // Create the request promise
    activeAdminRequests.session = api.get('/admin/session')
      .then(response => {
        cachedAdmin = response.data.user;
        return cachedAdmin;
      })
      .finally(() => {
        delete activeAdminRequests.session;
      });

    return await activeAdminRequests.session;
  } catch (error) {
    // Clear cache on error
    cachedAdmin = null;
    throw new Error(error.message || 'Failed to fetch admin session');
  }
};

// Change admin password
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await api.post('/admin/change-password', { 
      currentPassword, 
      newPassword 
    });
    
    // Invalidate cache since user data may have changed
    cachedAdmin = null;
    
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to change password');
  }
};

// Get admin dashboard with request deduplication
export const getDashboard = async () => {
  if (activeAdminRequests.dashboard) {
    return activeAdminRequests.dashboard;
  }

  try {
    activeAdminRequests.dashboard = api.get('/admin/dashboard')
      .then(response => response.data)
      .finally(() => {
        delete activeAdminRequests.dashboard;
      });

    return await activeAdminRequests.dashboard;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch dashboard');
  }
};