import axios from 'axios';

// Environment-based configuration
const getBaseURL = () => {
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:5000/api'; // Local development
  }
  return 'https://api.raeesmalls.com/api'; // Production
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

// Process queued requests after token refresh
const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (!config.skipAuth) {
      // Determine if this is an admin route
      const isAdminRoute = config.url.startsWith('/admin');
      const tokenKey = isAdminRoute ? 'adminToken' : 'userToken';
      const token = localStorage.getItem(tokenKey);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log(`API request: Adding ${tokenKey}`, { url: config.url, token });
      } else {
        console.log(`API request: No ${tokenKey} found`, { url: config.url });
      }
    }
    // Remove Content-Type for multipart/form-data
    if (config.isMultipart) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const isAdminRoute = originalRequest.url.startsWith('/admin');
        const newToken = await refreshToken(isAdminRoute);
        
        if (newToken) {
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          // Token refresh failed, but don't throw error to prevent auto-logout
          processQueue(error, null);
          console.warn('Token refresh failed - user may need to login again');
          
          // Return the original 401 error instead of throwing
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        console.error('Refresh token failed:', refreshError);
        
        // Don't throw the refresh error - return original 401 error
        // This prevents auto-logout and lets the component handle it
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle rate-limiting (429) errors
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || '30';
      return Promise.reject(new Error(`Too many requests. Retry after ${retryAfter} seconds.`));
    }

    // Handle network errors
    if (!error.response) {
      return Promise.reject(new Error('Network error: Please check your internet connection.'));
    }

    return Promise.reject(error);
  }
);

// Helper function for token refresh
const refreshToken = async (isAdmin = false) => {
  try {
    const tokenKey = isAdmin ? 'adminRefreshToken' : 'userRefreshToken';
    const refreshToken = localStorage.getItem(tokenKey);
    
    if (!refreshToken) {
      console.warn('No refresh token available');
      return null; // Return null instead of throwing
    }

    const endpoint = isAdmin ? '/admin/refresh-token' : '/auth/refresh-token';
    console.log(`refreshToken: Refreshing token for ${endpoint}`, { refreshToken });

    const response = await api.post(endpoint, { refreshToken }, {
      withCredentials: true,
      skipAuth: true, // Prevent infinite loop
    });

    const { success, data } = response.data;
    if (!success || !data?.token) {
      console.warn('Invalid refresh response: Missing token');
      return null; // Return null instead of throwing
    }

    const { token: accessToken, refreshToken: newRefreshToken } = data;
    localStorage.setItem(isAdmin ? 'adminToken' : 'userToken', accessToken);
    localStorage.setItem(tokenKey, newRefreshToken);
    console.log(`refreshToken: Tokens updated`, { accessToken, newRefreshToken });

    return accessToken;
  } catch (error) {
    console.error('Failed to refresh token:', error.response?.data || error.message);
    
    // Clear tokens only if it's a definitive auth failure (401/403)
    if (error.response?.status === 401 || error.response?.status === 403) {
      const tokenKey = isAdmin ? 'adminRefreshToken' : 'userRefreshToken';
      const accessTokenKey = isAdmin ? 'adminToken' : 'userToken';
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(accessTokenKey);
      console.log('Cleared invalid tokens');
    }
    
    // Return null instead of throwing to prevent auto-logout
    return null;
  }
};

// Public request helper
api.publicRequest = async (method, url, config = {}) => {
  return api({
    method,
    url,
    ...config,
    skipAuth: true,
    skipAuthRedirect: true,
  });
};

export default api;