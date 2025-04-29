import API from './api';

const AdminAuthService = {
  login: async (credentials) => {
    // Client-side validation remains unchanged
    if (!credentials.email || !credentials.password) {
      throw { message: 'Email and password are required', status: 400 };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      throw { message: 'Invalid email format', status: 400 };
    }

    try {
      const response = await API.post('/admin/login', credentials);
      
      // Store both tokens
      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      
      return response.data;
    } catch (error) {
      const errorObj = {
        message: error.response?.data?.message || 'Login failed',
        status: error.response?.status || 500,
        errors: error.response?.data?.errors?.map(err => err.msg) || []
      };
      console.error('Admin login error:', errorObj);
      throw errorObj;
    }
  },

  logout: async () => {
    try {
      const response = await API.post('/admin/logout');
      
      // Clear all tokens on logout
      localStorage.removeItem('adminToken');
      localStorage.removeItem('refreshToken');
      
      return response.data;
    } catch (error) {
      // Force clear tokens even if API call fails
      localStorage.removeItem('adminToken');
      localStorage.removeItem('refreshToken');
      
      const errorObj = {
        message: error.response?.data?.message || 'Logout failed',
        status: error.response?.status || 500,
        errors: error.response?.data?.errors?.map(err => err.msg) || []
      };
      console.error('Admin logout error:', errorObj);
      throw errorObj;
    }
  },

  // Add getSession method to fetch the current session user
  getSession: async () => {
    try {
      const response = await API.get('/admin/session');
      return response.data; // This will return the session data from the server
    } catch (error) {
      const errorObj = {
        message: error.response?.data?.message || 'Failed to retrieve session',
        status: error.response?.status || 500,
        errors: error.response?.data?.errors?.map(err => err.msg) || [],
      };
      console.error('Admin getSession error:', errorObj);
      throw errorObj; // If there's an error, it throws the error
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');
      
      const response = await API.post('/admin/refresh-token', { refreshToken });
      
      // Update stored tokens
      localStorage.setItem('adminToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      
      return response.data;
    } catch (error) {
      const errorObj = {
        message: error.response?.data?.message || 'Token refresh failed',
        status: error.response?.status || 500,
        errors: error.response?.data?.errors?.map(err => err.msg) || [],
        retryAfter: error.response?.headers['retry-after'] || null
      };
      console.error('Admin refreshToken error:', errorObj);
      throw errorObj;
    }
  }
};

export default AdminAuthService;
