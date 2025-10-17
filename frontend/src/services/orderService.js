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

// Add to your orderService.js
export const syncPaymentStatus = async (orderId) => {
  const response = await api.post(`/orders/${orderId}/sync-payment`);
  return response;
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

// NEW: Get order details
export const getOrderDetails = async (orderId) => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data;
};

// Payment-related services - UPDATED for Bank Alfalah
export const checkPaymentStatus = async (orderId) => {
  const response = await api.get(`/orders/${orderId}/payment/status`);
  return response.data;
};

export const retryPayment = async (orderId) => {
  const response = await api.post(`/orders/${orderId}/payment/retry`);
  return response.data;
};

export const handlePaymentReturn = async (queryParams) => {
  const response = await api.get('/orders/payment/return', { params: queryParams });
  return response.data;
};

// NEW: Handle payment IPN (for webhook callbacks)
export const handlePaymentIPN = async (ipnData) => {
  const response = await api.post('/orders/payment/ipn', ipnData);
  return response.data;
};

// Analytics services
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
  
  const response = await api.get('/orders/analytics/revenue', { params });
  return response.data;
};

export const getProductRevenue = async (limit = 10, startDate = '', endDate = '') => {
  const params = { limit };
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  
  const response = await api.get('/orders/analytics/products', { params });
  return response.data;
};

// NEW: Payment gateway utilities
export const submitPaymentForm = (formData, actionUrl) => {
  return new Promise((resolve, reject) => {
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = actionUrl;
      form.style.display = 'none';

      // Add all form fields
      Object.keys(formData).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = formData[key];
        form.appendChild(input);
      });

      // Add submit button (required by some gateways)
      const submitInput = document.createElement('input');
      submitInput.type = 'submit';
      submitInput.style.display = 'none';
      form.appendChild(submitInput);

      document.body.appendChild(form);
      
      // Store form reference for cleanup
      window.currentPaymentForm = form;
      
      // Auto-submit the form
      form.submit();
      resolve({ success: true, message: 'Payment form submitted' });
    } catch (error) {
      reject(new Error(`Payment form submission failed: ${error.message}`));
    }
  });
};

// NEW: Validate payment data before submission
export const validatePaymentData = (paymentData) => {
  const errors = [];
  
  if (!paymentData.transactionId) {
    errors.push('Transaction ID is required');
  }
  
  if (!paymentData.formData || typeof paymentData.formData !== 'object') {
    errors.push('Payment form data is required');
  }
  
  if (!paymentData.actionUrl) {
    errors.push('Payment gateway URL is required');
  }
  
  return errors;
};