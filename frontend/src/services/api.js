import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (config.skipAuth) return config;

    // Get the appropriate token based on route
    const token = config.url.includes('/admin') 
      ? localStorage.getItem('adminToken')
      : localStorage.getItem('token');
    
    // Get refresh token if available
    const refreshToken = localStorage.getItem('refreshToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add refresh token to body for refresh endpoint
    if (config.url.includes('/refresh-token') && refreshToken) {
      config.data = { ...config.data, refreshToken };
    }

    if (config.isMultipart) {
      config.headers['Content-Type'] = 'multipart/form-data';
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