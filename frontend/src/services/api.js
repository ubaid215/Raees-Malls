import axios from 'axios';

// Environment-based configuration
const getBaseURL = () => {
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:5000/api'; // Local development
  }
  return 'https://api.raeesmalls.com/api'; // Production
};

const api = axios.create({
  baseURL: getBaseURL(), // Automatically switches between dev/prod
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (!config.skipAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    // Remove Content-Type for multipart/form-data to let the browser set it with the boundary
    if (config.isMultipart) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await refreshToken();
        if (newToken) {
          // Update the Authorization header
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        // The AuthContext will handle the logout
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function for token refresh
const refreshToken = async () => {
  try {
    const response = await api.post('/auth/refresh-token', {
      refreshToken: localStorage.getItem('refreshToken')
    });
    const { token } = response.data;
    localStorage.setItem('token', token);
    return token;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    // Clear auth state and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return null;
  }
};

// Preserve existing publicRequest helper
api.publicRequest = async (method, url, config = {}) => {
  return api({
    method,
    url,
    ...config,
    skipAuth: true,
    skipAuthRedirect: true
  });
};

export default api;