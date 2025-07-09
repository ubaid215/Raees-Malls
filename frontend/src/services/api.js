import axios from 'axios';
import { toastError } from '../components/core/ToastNotification';

// Environment-based configuration
const getBaseURL = () => {
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:5000/api';
  }
  return 'https://api.raeesmalls.com/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let isRefreshing = false;
let failedQueue = [];

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

api.interceptors.request.use(
  (config) => {
    if (!config.skipAuth) {
      const isAdminRoute = config.url.startsWith('/admin');
      const tokenKey = isAdminRoute ? 'adminToken' : 'userToken';
      const token = localStorage.getItem(tokenKey);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
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
          processQueue(error, null);
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || '30';
      toastError(`Too many requests. Please try again after ${retryAfter} seconds.`);
      return Promise.reject(error);
    }

    if (!error.response) {
      toastError('Network error: Please check your internet connection.');
      return Promise.reject(error);
    }

    // Handle specific error messages from server
    if (error.response.data?.message) {
      toastError(error.response.data.message);
    } else if (error.response.data?.errors) {
      const errorMessages = error.response.data.errors.map(e => e.message || e.msg).join(', ');
      toastError(errorMessages);
    } else {
      toastError('An unexpected error occurred. Please try again.');
    }

    return Promise.reject(error);
  }
);

const refreshToken = async (isAdmin = false) => {
  try {
    const tokenKey = isAdmin ? 'adminRefreshToken' : 'userRefreshToken';
    const refreshToken = localStorage.getItem(tokenKey);
    
    if (!refreshToken) {
      return null;
    }

    const endpoint = isAdmin ? '/admin/refresh-token' : '/auth/refresh-token';
    const response = await api.post(endpoint, { refreshToken }, {
      withCredentials: true,
      skipAuth: true,
    });

    const { success, data } = response.data;
    if (!success || !data?.token) {
      return null;
    }

    const { token: accessToken, refreshToken: newRefreshToken } = data;
    localStorage.setItem(isAdmin ? 'adminToken' : 'userToken', accessToken);
    localStorage.setItem(tokenKey, newRefreshToken);

    return accessToken;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      const tokenKey = isAdmin ? 'adminRefreshToken' : 'userRefreshToken';
      const accessTokenKey = isAdmin ? 'adminToken' : 'userToken';
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(accessTokenKey);
    }
    
    return null;
  }
};

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