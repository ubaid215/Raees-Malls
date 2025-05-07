import api from './api';

export const placeOrder = async (orderData) => {
  const response = await api.post('/orders', orderData);
  return response.data;
};

export const getUserOrders = async (page = 1, limit = 10, status = '') => {
  const response = await api.get('/orders/user', {
    params: { page, limit, status },
  });
  return response.data;
};

export const getAllOrders = async (page = 1, limit = 10, status = '', userId = '') => {
  const response = await api.get('/orders', { 
    params: { page, limit, status, userId },
  });
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