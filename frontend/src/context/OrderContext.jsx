import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { debounce } from 'lodash';
import { useAdminAuth } from './AdminAuthContext';
import { useAuth } from './AuthContext';
import { placeOrder, getUserOrders, getAllOrders, updateOrderStatus, downloadInvoice, cancelOrder as apiCancelOrder } from '../services/orderService';
import socketService from '../services/socketService';
import { toast } from 'react-toastify';

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
        if (typeof item.shippingCost !== 'number' || item.shippingCost < 0) {
          errors.push(`Item ${index + 1}: Shipping cost must be a non-negative number`);
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
    
    if (typeof orderData.totalShippingCost !== 'number' || orderData.totalShippingCost < 0) {
      errors.push('Total shipping cost must be a non-negative number');
    }
    
    return errors;
  };

  const clearOrdersCache = useCallback(() => {
    if (user) {
      const cacheKeyPattern = `orders_user_${user?._id}_page_*`;
      // Note: Redis or localStorage doesn't support wildcards natively in localStorage
      // For simplicity, clear known cache keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`orders_user_${user?._id}_page_`)) {
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}_timestamp`);
        }
      });
      console.log('Orders cache cleared for user:', user?._id);
    }
  }, [user]);

  const fetchUserOrders = useCallback(async (page = 1, limit = 10, status = '') => {
    if (!isRegularUser && !isAdmin) {
      return;
    }

    // Check cache
    const cacheKey = `orders_user_${user?._id}_page_${page}_limit_${limit}_status_${status || 'all'}`;
    const cached = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 5 * 60 * 1000; // 5 minutes

    if (cached && cacheValid) {
      console.log('fetchUserOrders: Using cached orders');
      const { orders, pagination } = JSON.parse(cached);
      setOrders(orders);
      setPagination(pagination);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await getUserOrders(page, limit, status);
      const { orders, total, page: currentPage, limit: currentLimit, totalPages } = response.data;
      if (!Array.isArray(orders)) {
        setError('Invalid orders data received');
        setOrders([]);
        return;
      }
      const filteredOrders = orders.filter(order => order && order.orderId);
      setOrders(filteredOrders);
      setPagination({ total, page: currentPage, limit: currentLimit, totalPages });
      // Cache response
      localStorage.setItem(cacheKey, JSON.stringify({
        orders: filteredOrders,
        pagination: { total, page: currentPage, limit: currentLimit, totalPages }
      }));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    } catch (err) {
      await handleOrderError(err, isRegularUser, () => fetchUserOrders(page, limit, status));
    } finally {
      setLoading(false);
    }
  }, [isRegularUser, isAdmin, refreshToken, user?._id]);

  const debouncedFetchUserOrders = useCallback(
    debounce((page, limit, status) => {
      return new Promise((resolve, reject) => {
        fetchUserOrders(page, limit, status).then(resolve).catch(reject);
      });
    }, 1000),
    [fetchUserOrders]
  );

  const fetchAllOrders = useCallback(async (page = 1, limit = 10, status = '', userId = '') => {
    if (!isAdmin) {
      return;
    }

    // Check cache
    const cacheKey = `orders_all_page_${page}_limit_${limit}_status_${status || 'all'}_user_${userId || 'all'}`;
    const cached = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 5 * 60 * 1000; // 5 minutes

    if (cached && cacheValid) {
      console.log('fetchAllOrders: Using cached orders');
      const { orders, pagination } = JSON.parse(cached);
      setOrders(orders);
      setPagination(pagination);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await getAllOrders(page, limit, status, userId);
      const { orders, total, page: currentPage, limit: currentLimit, totalPages } = response.data;
      if (!Array.isArray(orders)) {
        setError('Invalid orders data received');
        setOrders([]);
        return;
      }
      const filteredOrders = orders.filter(order => order && order.orderId);
      setOrders(filteredOrders);
      setPagination({ total, page: currentPage, limit: currentLimit, totalPages });
      // Cache response
      localStorage.setItem(cacheKey, JSON.stringify({
        orders: filteredOrders,
        pagination: { total, page: currentPage, limit: currentLimit, totalPages }
      }));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    } catch (err) {
      await handleOrderError(err, isAdmin, () => fetchAllOrders(page, limit, status, userId));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, refreshAdminToken]);

  const debouncedFetchAllOrders = useCallback(
    debounce((page, limit, status, userId) => {
      return new Promise((resolve, reject) => {
        fetchAllOrders(page, limit, status, userId).then(resolve).catch(reject);
      });
    }, 1000),
    [fetchAllOrders]
  );

  useEffect(() => {
    if (!userRole) return;

    const fetchData = isAdmin ? debouncedFetchAllOrders : debouncedFetchUserOrders;
    fetchData(1, 10);

    let pollingInterval = null;

    if (isAdmin) {
      socketService.connect(admin?._id, 'admin');

      const handleSocketError = (error) => {
        setError('Failed to connect to real-time updates. Using fallback polling.');
        if (!pollingInterval) {
          pollingInterval = setInterval(() => {
            if (!socketService.getConnectionState()) {
              debouncedFetchAllOrders(1, 10);
            }
          }, 30000);
        }
      };

      socketService.on('connect_error', handleSocketError);

      if (socketService.getConnectionState()) {
        socketService.on('orderCreated', () => debouncedFetchAllOrders(1, 10));
        socketService.on('orderStatusUpdated', () => debouncedFetchAllOrders(1, 10));
      }

      socketService.on('connect', () => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
          setError('');
        }
        socketService.on('orderCreated', () => debouncedFetchAllOrders(1, 10));
        socketService.on('orderStatusUpdated', () => debouncedFetchAllOrders(1, 10));
      });

      socketService.on('disconnect', () => {
        if (!pollingInterval) {
          pollingInterval = setInterval(() => {
            if (!socketService.getConnectionState()) {
              debouncedFetchAllOrders(1, 10);
            }
          }, 30000);
        }
      });
    } else if (isRegularUser) {
      socketService.connect(user?._id, 'user');
      socketService.on('orderCreated', () => debouncedFetchUserOrders(1, 10));
      socketService.on('orderStatusUpdated', () => debouncedFetchUserOrders(1, 10));
    }

    return () => {
      socketService.off('orderCreated');
      socketService.off('orderStatusUpdated');
      socketService.off('connect');
      socketService.off('connect_error');
      socketService.off('disconnect');
      socketService.disconnect();
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      debouncedFetchUserOrders.cancel();
      debouncedFetchAllOrders.cancel();
    };
  }, [isAdmin, isRegularUser, userRole, debouncedFetchAllOrders, debouncedFetchUserOrders, admin?._id, user?._id]);

  const handleOrderError = async (err, isUser, retryFn) => {
    console.error('Order error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    if (err.response && err.response.status === 401) {
      try {
        await (isUser ? refreshToken() : refreshAdminToken());
        await retryFn();
      } catch (refreshErr) {
        setError(isUser ? 'Session expired. Please log in again.' : 'Admin session expired. Please log in again.');
        throw new Error('Token refresh failed: ' + refreshErr.message);
      }
    } else {
      setError(err.response?.data?.message || err.message || 'An error occurred while processing the request');
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
          shippingCost: item.shippingCost || 0,
        })),
        totalShippingCost: orderData.totalShippingCost || 0,
      });

      if (isAdmin) {
        await debouncedFetchAllOrders(1, 10);
      } else if (isRegularUser) {
        clearOrdersCache(); // Invalidate cache
        await debouncedFetchUserOrders(1, 10);
      }
      
      return order;
    } catch (err) {
      await handleOrderError(err, isRegularUser || isAdmin, () => placeNewOrder(orderData));
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
    
    if (!orderId || typeof orderId !== 'string') {
      setError('Invalid order ID');
      setLoading(false);
      throw new Error('Invalid order ID');
    }

    try {
      const order = await updateOrderStatus(orderId, status);
      clearOrdersCache(); // Invalidate cache
      await debouncedFetchAllOrders(1, 10);
      return order;
    } catch (err) {
      await handleOrderError(err, isAdmin, () => updateStatus(orderId, status));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelUserOrder = async (orderId) => {
    if (!isRegularUser) {
      setError('Unauthorized: Only users can cancel their own orders');
      throw new Error('Unauthorized: Only users can cancel their own orders');
    }
    
    setLoading(true);
    setError('');
    
    if (!orderId || typeof orderId !== 'string') {
      setError('Invalid order ID');
      setLoading(false);
      throw new Error('Invalid order ID');
    }

    try {
      const order = await apiCancelOrder(orderId);
      clearOrdersCache(); // Invalidate cache
      await debouncedFetchUserOrders(1, 10);
      toast.success('Order cancelled successfully');
      return order;
    } catch (err) {
      console.error('Cancel order error:', {
        orderId,
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      await handleOrderError(err, isRegularUser, () => cancelUserOrder(orderId));
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
    
    if (!orderId || typeof orderId !== 'string') {
      setError('Invalid order ID');
      setLoading(false);
      throw new Error('Invalid order ID');
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
      await handleOrderError(err, isRegularUser || isAdmin, () => downloadOrderInvoice(orderId));
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
    fetchUserOrders: debouncedFetchUserOrders,
    fetchAllOrders: debouncedFetchAllOrders,
    updateStatus,
    cancelOrder: cancelUserOrder,
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