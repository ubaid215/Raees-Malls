import api from './api';

// Place order (user or admin)
export const placeOrder = async (orderData) => {
  try {
    const response = await api.post('/orders', orderData);
    return response.data.order;
  } catch (error) {
    throw new Error(error.message || 'Failed to place order');
  }
};

// Get user orders (user)
export const getUserOrders = async (page = 1, limit = 10) => {
  try {
    const response = await api.get('/orders', { params: { page, limit } });
    return response.data.orders;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch user orders');
  }
};

// Get all orders (admin)
export const getAllOrders = async (page = 1, limit = 10) => {
  try {
    const response = await api.get('/admin/orders', { params: { page, limit } });
    return response.data.orders;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch all orders');
  }
};

// Update order status (admin)
export const updateOrderStatus = async (orderId, status) => {
  try {
    const response = await api.put(`/admin/orders/${orderId}`, { status });
    return response.data.order;
  } catch (error) {
    throw new Error(error.message || 'Failed to update order status');
  }
};

// Download invoice (admin)
export const downloadInvoice = async (orderId) => {
  try {
    const response = await api.get(`/admin/orders/invoice/${orderId}`, {
      responseType: 'blob' // Handle PDF as binary
    });
    // Create a URL for the blob and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice_${orderId}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    throw new Error(error.message || 'Failed to download invoice');
  }
};