import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { useAdminAuth } from './AdminAuthContext';
import { useAuth } from './AuthContext'; 
import { placeOrder, getUserOrders, getAllOrders, updateOrderStatus, downloadInvoice } from '../services/orderService';
import socketService from '../services/socketService';

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const { admin, isAdminAuthenticated, refreshAdminToken } = useAdminAuth();
  const { user, isAuthenticated, refreshToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = isAdminAuthenticated && admin && (admin.role === 'admin' || admin.role === 'administrator');
  const isRegularUser = isAuthenticated && user && user.role === 'user';
  const userRole = isAdmin ? admin.role : (isRegularUser ? user.role : null);

  const validateOrderData = (orderData) => {
    const errors = [];
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      errors.push('Order must contain at least one item');
    } else {
      orderData.items.forEach((item, index) => {
        if (!item.productId) {
          errors.push(`Item ${index + 1}: Product ID is required`);
        }
        if (item.variantId && typeof item.variantId !== 'string') {
          errors.push(`Item ${index + 1}: Variant ID must be a string`);
        }
        if (!item.quantity || item.quantity < 1 || !Number.isInteger(item.quantity)) {
          errors.push(`Item ${index + 1}: Quantity must be a positive integer`);
        }
      });
    }
    
    if (!orderData.shippingAddress || typeof orderData.shippingAddress !== 'object') {
      errors.push('Shipping address is required');
    } else {
      const { fullName, addressLine1, city, state, postalCode, country, phone } = orderData.shippingAddress;
      if (!fullName) errors.push('Full name is required');
      if (!addressLine1) errors.push('Address line 1 is required');
      if (!city) errors.push('City is required');
      if (!state) errors.push('State is required');
      if (!postalCode) errors.push('Postal code is required');
      if (!country) errors.push('Country is required');
      if (!phone) {
        errors.push('Phone number is required');
      } else if (!/^\+\d{1,4}\s\d{6,14}$/.test(phone)) {
        errors.push('Phone number must be in the format +[country code] [number]');
      }
    }
    
    if (orderData.discountCode && !/^[A-Z0-9-]+$/i.test(orderData.discountCode)) {
      errors.push('Discount code can only contain letters, numbers, and hyphens');
    }
    
    return errors;
  };

  useEffect(() => {
    if (!userRole) return;

    const fetchData = isAdmin ? fetchAllOrders : fetchUserOrders;
    fetchData();

    // Setup socket listeners based on role
    if (isAdmin) {
      socketService.on('orderCreated', fetchAllOrders);
      socketService.on('orderStatusUpdated', fetchAllOrders);
    } else if (isRegularUser) {
      socketService.on('orderCreated', fetchUserOrders);
      socketService.on('orderStatusUpdated', fetchUserOrders);
    }

    return () => {
      socketService.off('orderCreated');
      socketService.off('orderStatusUpdated');
    };
  }, [isAdmin, isRegularUser, userRole]);

  const fetchUserOrders = useCallback(async (page = 1, limit = 10, status = '') => {
    if (!isRegularUser && !isAdmin) return;
    
    setLoading(true);
    setError('');
    try {
      const { orders, total, page: currentPage, limit: currentLimit, totalPages } = await getUserOrders(page, limit, status);
      setOrders(orders);
      setPagination({ total, page: currentPage, limit: currentLimit, totalPages });
    } catch (err) {
      handleOrderError(err, isRegularUser, () => fetchUserOrders(page, limit, status));
    } finally {
      setLoading(false);
    }
  }, [isRegularUser, isAdmin, refreshToken]);

  const fetchAllOrders = useCallback(async (page = 1, limit = 10, status = '', userId = '') => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError('');
    try {
      const { orders, total, page: currentPage, limit: currentLimit, totalPages } = await getAllOrders(page, limit, status, userId);
      setOrders(orders);
      setPagination({ total, page: currentPage, limit: currentLimit, totalPages });
    } catch (err) {
      handleOrderError(err, isAdmin, () => fetchAllOrders(page, limit, status, userId));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, refreshAdminToken]);

  const handleOrderError = async (err, isUser, retryFn) => {
    if (err.response && err.response.status === 401) {
      try {
        await (isUser ? refreshToken() : refreshAdminToken());
        await retryFn();
      } catch (refreshErr) {
        setError(isUser ? 'Session expired. Please log in again.' : 'Admin session expired. Please log in again.');
        throw refreshErr;
      }
    } else {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      throw err;
    }
  };

  const placeNewOrder = async (orderData) => {
    setLoading(true);
    setError('');
    
    const validationErrors = validateOrderData(orderData);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      setLoading(false);
      throw new Error(validationErrors.join(', '));
    }

    try {
      const order = await placeOrder({
        ...orderData,
        items: orderData.items.map(item => ({
          ...item,
          productId: String(item.productId),
        }))
      });

      // Refresh orders based on role
      if (isAdmin) {
        await fetchAllOrders();
      } else if (isRegularUser) {
        await fetchUserOrders();
      }
      
      return order;
    } catch (err) {
      handleOrderError(err, isRegularUser || isAdmin, () => placeNewOrder(orderData));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    if (!isAdmin) {
      setError('Unauthorized: Only admins can update order status');
      throw new Error('Unauthorized: Only admins can update order status');
    }
    
    setLoading(true);
    setError('');
    
    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      setError('Invalid status value');
      setLoading(false);
      throw new Error('Invalid status value');
    }
    
    if (!/^ORD-[A-F0-9]{8}$/i.test(orderId)) {
      setError('Invalid order ID format');
      setLoading(false);
      throw new Error('Invalid order ID format');
    }

    try {
      const order = await updateOrderStatus(orderId, status);
      await fetchAllOrders();
      return order;
    } catch (err) {
      handleOrderError(err, isAdmin, () => updateStatus(orderId, status));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const downloadOrderInvoice = async (orderId) => {
    if (!isAdmin && !isRegularUser) {
      setError('Unauthorized: Please log in to download invoices');
      throw new Error('Unauthorized: Please log in to download invoices');
    }
    
    setLoading(true);
    setError('');
    
    if (!/^ORD-[A-F0-9]{8}$/i.test(orderId)) {
      setError('Invalid order ID format');
      setLoading(false);
      throw new Error('Invalid order ID format');
    }

    try {
      const response = await downloadInvoice(orderId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      return response;
    } catch (err) {
      handleOrderError(err, isRegularUser || isAdmin, () => downloadOrderInvoice(orderId));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    orders,
    pagination,
    loading,
    error,
    placeNewOrder,
    fetchUserOrders,
    fetchAllOrders,
    updateStatus,
    downloadOrderInvoice,
    isAdmin,
    isRegularUser
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};