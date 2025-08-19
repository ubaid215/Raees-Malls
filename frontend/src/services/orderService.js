import api from './api';

export const placeOrder = async (orderData) => {
  const response = await api.post('/orders', orderData);
  return response.data;
};

export const getUserOrders = async (page = 1, limit = 10, status = '') => {
  const params = { page, limit };
  if (status && status.trim() !== '') {
    params.status = status;
  }
  
  const response = await api.get('/orders/user', { params });
  return response.data;
};

export const getAllOrders = async (page = 1, limit = 10, status = '', userId = '') => {
  const params = { page, limit };
  if (status && status.trim() !== '') {
    params.status = status;
  }
  if (userId && userId.trim() !== '') {
    params.userId = userId;
  }
  
  const response = await api.get('/orders', { params });
  return response.data;
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await api.put(`/orders/${orderId}/status`, { status });
  return response.data;
};

export const cancelOrder = async (orderId) => {
  const response = await api.put(`/orders/${orderId}/cancel`);
  return response.data;
};

export const downloadInvoice = async (orderId) => {
  const response = await api.get(`/orders/${orderId}/invoice`, {
    responseType: 'blob',
  });
  return response;
};

// New service functions to match backend capabilities
export const getRecentOrderNotifications = async (limit = 5) => {
  const response = await api.get('/orders/notifications/recent', {
    params: { limit }
  });
  return response.data;
};

export const getRevenueStats = async (period = 'month', startDate = '', endDate = '') => {
  const params = { period };
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  
  const response = await api.get('/orders/stats/revenue', { params });
  return response.data;
};

export const getProductRevenue = async (limit = 10, startDate = '', endDate = '') => {
  const params = { limit };
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  
  const response = await api.get('/orders/stats/products', { params });
  return response.data;
};