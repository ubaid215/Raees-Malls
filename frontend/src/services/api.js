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
    const { response } = error;

    // Handle rate limiting
    if (response?.status === 429) {
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        const retryAfter = response.headers['retry-after'] || 1;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return api(originalRequest);
      }
      return Promise.reject(new Error('Too many requests. Please try again later.'));
    }

    // Auto-refresh token logic
    if (response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.skipAuth &&
        !originalRequest.url.includes('/refresh-token')) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        
        const { data } = await api.post('/admin/refresh-token', { refreshToken });
        
        localStorage.setItem('adminToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect
        localStorage.removeItem('adminToken');
        localStorage.removeItem('refreshToken');
        if (!originalRequest.skipAuthRedirect) {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
    }

    // Handle validation errors
    if (response?.status === 400) {
      const message = response.data?.errors
        ? response.data.errors.map(err => err.msg).join(', ')
        : response.data?.message || 'Validation failed';
      return Promise.reject(new Error(message));
    }

    // Generic error handling
    const errorMessage = response?.data?.message 
      || `Request failed with status ${response?.status || 'unknown'}`;
    return Promise.reject(new Error(errorMessage));
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