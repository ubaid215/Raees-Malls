import axios from 'axios';

// Create Axios instance for Order APIs
const OrderAPI = axios.create({ 
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true
});

// Request interceptor for auth tokens
OrderAPI.interceptors.request.use((req) => {
  const isAdminRoute = req.url.includes('/api/orders/admin');
  const token = isAdminRoute 
    ? localStorage.getItem('adminAccessToken')
    : localStorage.getItem('accessToken');
  
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Response interceptor for token refresh
OrderAPI.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const isAdminRoute = originalRequest.url.includes('/api/orders/admin');
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = isAdminRoute
          ? localStorage.getItem('adminRefreshToken')
          : localStorage.getItem('refreshToken');
        
        if (!refreshToken) throw error;
        
        const { data } = await OrderAPI.post(isAdminRoute 
          ? '/api/admin/refresh-token'
          : '/api/auth/refresh-token', 
          { refreshToken }
        );
        
        if (isAdminRoute) {
          localStorage.setItem('adminAccessToken', data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem('adminRefreshToken', data.refreshToken);
          }
        } else {
          localStorage.setItem('accessToken', data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
        }
        
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return OrderAPI(originalRequest);
      } catch (refreshError) {
        if (isAdminRoute) {
          localStorage.removeItem('adminAccessToken');
          localStorage.removeItem('adminRefreshToken');
          window.location = '/admin/login';
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * Place a new order (User)
 * @param {Object} data - Order data { items: [{ productId, quantity, sku }], shippingAddress: {...} }
 * @returns {Promise} - Axios response
 */
export const placeOrder = (data) => OrderAPI.post('/api/orders', data);

/**
 * Get user's order history (User)
 * @param {Object} params - Query params { page, limit, status }
 * @returns {Promise} - Axios response
 */
export const getUserOrders = (params) => OrderAPI.get('/api/orders', { params });

/**
 * Get all orders (Admin)
 * @param {Object} params - Query params { page, limit, status, userId }
 * @returns {Promise} - Axios response
 */
export const getAllOrders = (params) => OrderAPI.get('/api/orders/admin', { params });

/**
 * Update order status (Admin)
 * @param {string} orderId - Order ID (e.g., ORD-xxxxxxxx)
 * @param {Object} data - Status data { status }
 * @returns {Promise} - Axios response
 */
export const updateOrderStatus = (orderId, data) => OrderAPI.put(`/api/orders/admin/${orderId}`, data);

/**
 * Download order invoice as PDF (Admin)
 * @param {string} orderId - Order ID (e.g., ORD-xxxxxxxx)
 * @returns {Promise} - Axios response (PDF stream)
 */
export const downloadInvoice = (orderId) => OrderAPI.get(`/api/orders/admin/invoice/${orderId}`);

export default OrderAPI;