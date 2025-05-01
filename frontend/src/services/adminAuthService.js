import API from './api';

const AdminAuthService = {
  login: async (credentials) => {
    // Client-side validation
    if (!credentials.email || !credentials.password) {
      throw { message: 'Email and password are required', status: 400 };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      throw { message: 'Invalid email format', status: 400 };
    }

    try {
      const response = await API.post('/admin/login', credentials);
      const { token, refreshToken, user } = response.data.data;
      if (!token || !refreshToken) {
        throw { message: 'Invalid response from server: Missing tokens', status: 500 };
      }
      
      localStorage.setItem('adminToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      
      return response.data.data;
    } catch (error) {
      const errorObj = {
        message: error.response?.data?.message || 'Login failed. Please check your credentials or contact support.',
        status: error.response?.status || 500,
        errors: error.response?.data?.errors?.map(err => err.msg) || [],
        rawError: error.response?.data || error.message
      };
      console.error('Admin login error:', errorObj);
      throw errorObj;
    }
  },

  logout: async () => {
    try {
      const response = await API.post('/admin/logout');
      
      localStorage.removeItem('adminToken');
      localStorage.removeItem('refreshToken');
      
      return response.data;
    } catch (error) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('refreshToken');
      
      const errorObj = {
        message: error.response?.data?.message || 'Logout failed',
        status: error.response?.status || 500,
        errors: error.response?.data?.errors?.map(err => err.msg) || [],
        rawError: error.response?.data || error.message
      };
      console.error('Admin logout error:', errorObj);
      throw errorObj;
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');
      
      const response = await API.post('/admin/refresh-token', { refreshToken });
      
      const { token: accessToken, refreshToken: newRefreshToken, user } = response.data.data;
      if (!accessToken || !newRefreshToken) {
        throw { message: 'Invalid refresh response: Missing tokens', status: 500 };
      }
      localStorage.setItem('adminToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      return response.data.data;
    } catch (error) {
      const errorObj = {
        message: error.response?.data?.message || 'Token refresh failed. Please log in again.',
        status: error.response?.status || 500,
        errors: error.response?.data?.errors?.map(err => err.msg) || [],
        rawError: error.response?.data || error.message,
        retryAfter: error.response?.headers['retry-after'] || null
      };
      console.error('Admin refreshToken error:', errorObj);
      throw errorObj;
    }
  },

  changeAdminPassword: async (currentPassword, newPassword, confirmPassword) => {
    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw { message: 'All password fields are required', status: 400 };
    }
    if (newPassword.length < 8) {
      throw { message: 'New password must be at least 8 characters', status: 400 };
    }
    if (newPassword !== confirmPassword) {
      throw { message: 'New password and confirm password must match', status: 400 };
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) {
      throw {
        message: 'New password must contain at least one uppercase, one lowercase, one number, and one special character',
        status: 400,
      };
    }
  
    try {
      const response = await API.post('/admin/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
  
      // Backend returns { success: true, message: string }
      return {
        message: response.data.message || 'Password changed successfully',
      };
    } catch (error) {
      const errorObj = {
        message: error.response?.data?.message || 'Failed to change password',
        status: error.response?.status || 500,
        errors: error.response?.data?.errors?.map(err => err.msg) || [],
        rawError: error.response?.data || error.message,
      };
      console.error('Change password error:', errorObj);
      throw errorObj;
    }
  },
};

export default AdminAuthService;