import axios from 'axios';

const API = axios.create({ 
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true 
});

// Request interceptor for auth tokens
API.interceptors.request.use((req) => {
  const isAdminRoute = req.url.startsWith('/api/admin/');
  const token = isAdminRoute 
    ? localStorage.getItem('adminAccessToken')
    : localStorage.getItem('accessToken');
  
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Response interceptor for token refresh
API.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const isAdminRoute = originalRequest.url.startsWith('/api/admin/');
    
    // Only handle 401 errors for auth routes
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = isAdminRoute
          ? localStorage.getItem('adminRefreshToken')
          : localStorage.getItem('refreshToken');
        
        if (!refreshToken) throw error;
        
        const { data } = await API.post(isAdminRoute 
          ? '/api/admin/refresh-token'
          : '/api/auth/refresh-token', 
          { refreshToken }
        );
        
        // Store new tokens
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
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect
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

// User Authentication APIs
export const register = (data) => API.post('/api/auth/register', data);
export const login = (data) => API.post('/api/auth/login', data);
export const refreshToken = (data) => API.post('/api/auth/refresh-token', data);
export const logout = () => API.post('/api/auth/logout');
export const getMe = () => API.get('/api/auth/me');

// Admin Authentication APIs
export const adminLogin = (data) => API.post('/api/admin/login', data);
export const adminLogout = () => API.post('/api/admin/logout');
export const getAdminSession = () => API.get('/api/admin/session');
export const adminChangePassword = (data) => API.post('/api/admin/change-password', data);

// Admin Dashboard
export const getAdminDashboard = () => API.get('/api/admin/dashboard');

// Banner APIs
export const uploadBanner = (formData) => API.post('/api/admin/banners', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateBanner = (bannerId, formData) => API.put(`/api/admin/banners/${bannerId}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteBanner = (bannerId) => API.delete(`/api/admin/banners/${bannerId}`);
export const getAllBanners = (params) => API.get('/api/admin/banners', { params });
export const getActiveBanners = () => API.get('/api/banners/active');

// Cart APIs
export const addToCart = (data) => API.post('/api/cart', data);
export const getCart = () => API.get('/api/cart');
export const removeFromCart = (productId) => API.delete(`/api/cart/${productId}`);
export const clearCart = () => API.delete('/api/cart');
export const placeOrderFromCart = (data) => API.post('/api/cart/order', data);

// Review APIs
export const addReview = (data) => API.post('/api/reviews', data);
export const getProductReviews = (productId, params) => API.get(`/api/reviews/${productId}`, { params });
export const deleteReview = (reviewId) => API.delete(`/api/reviews/${reviewId}`);

// Product APIs (Public)
export const getAllProductsForCustomers = (params) => API.get('/api/products/public', { params });
export const getProductDetailsForCustomers = (id) => API.get(`/api/products/public/${id}`);

// Product APIs (Admin)
export const createProduct = (formData) => API.post(`/api/admin/products`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getAllProducts = (params) => API.get('/api/admin/products', { params });
export const getProductById = (id) => API.get(`/api/admin/products/${id}`);
export const updateProduct = (id, formData) => API.put(`/api/admin/products/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteProduct = (id) => API.delete(`/api/admin/products/${id}`);

// Order APIs (User)
export const placeOrder = (data) => API.post('/api/orders', data);
export const getUserOrders = (params) => API.get('/api/orders', { params });

// Order APIs (Admin)
export const getAllOrders = (params) => API.get('/api/admin/orders', { params });
export const updateOrderStatus = (orderId, data) => API.put(`/api/admin/orders/${orderId}`, data);
export const downloadInvoice = (orderId) => API.get(`/api/admin/orders/invoice/${orderId}`);

// Category APIs (Public)
export const getAllCategoriesForCustomers = (params) => API.get('/api/categories/public', { params });
export const getCategoryByIdForCustomers = (id) => API.get(`/api/categories/public/${id}`);
export const getCategoryProductsForCustomers = (id, params) => API.get(`/api/categories/public/${id}/products`, { params });

// Category APIs (Admin)
export const createCategory = (data) => API.post('/api/admin/categories', data);
export const getAllCategories = (params) => API.get('/api/admin/categories', { params });
export const getCategoryById = (id) => API.get(`/api/admin/categories/${id}`);
export const updateCategory = (id, data) => API.put(`/api/admin/categories/${id}`, data);
export const deleteCategory = (id) => API.delete(`/api/admin/categories/${id}`);

export default API;