import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 5000 // Set timeout to 5 seconds
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');
    
    // Set Authorization header
    if (token && !config.url.includes('/admin')) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (adminToken && config.url.includes('/admin')) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }

    // Set Content-Type for multipart/form-data if needed
    if (config.url.includes('/admin/products') && config.method !== 'get') {
      config.headers['Content-Type'] = 'multipart/form-data';
    }

    // Add cache-busting parameter for GET requests
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _: Date.now() // Cache busting
      };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with retry logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const { response } = error;
    
    // Retry logic for rate limiting (429 errors)
    if (response?.status === 429 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Exponential backoff
      const delay = Math.pow(2, originalRequest._retryCount || 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return api(originalRequest);
    }

    if (response) {
      // Handle validation errors
      if (response.status === 400 && response.data.errors) {
        const errorMessages = response.data.errors.map((err) => err.msg).join(', ');
        return Promise.reject(new Error(errorMessages || response.data.message));
      }
      
      // Handle JWT errors
      if (response.status === 401 && response.data.message.includes('Token error')) {
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userId');
        window.location.href = '/login';
        return Promise.reject(new Error('Authentication failed. Please log in again.'));
      }
      
      // Handle other errors
      return Promise.reject(new Error(response.data.message || 'An error occurred'));
    }
    
    return Promise.reject(new Error('Network error. Please try again.'));
  }
);

export default api;