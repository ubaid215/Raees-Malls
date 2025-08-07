import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
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

  // Fixed cache clearing function
  const clearAllOrdersCache = useCallback(() => {
    console.log('Clearing all orders cache...');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('orders_') || key.includes('_orders_')) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_timestamp`);
        console.log('Removed cache key:', key);
      }
    });
  }, []);

  const clearUserOrdersCache = useCallback(() => {
    if (user?._id) {
      console.log('Clearing user orders cache for:', user._id);
      Object.keys(localStorage).forEach(key => {
        if (key.includes(`user_${user._id}`)) {
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}_timestamp`);
          console.log('Removed user cache key:', key);
        }
      });
    }
  }, [user?._id]);

  const fetchUserOrders = useCallback(async (page = 1, limit = 10, status = '', forceRefresh = false) => {
    if (!isRegularUser && !isAdmin) {
      return;
    }

    const cacheKey = `orders_user_${user?._id}_page_${page}_limit_${limit}_status_${status || 'all'}`;
    
    // Skip cache if forceRefresh is true
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 2 * 60 * 1000; // Reduced to 2 minutes

      if (cached && cacheValid) {
        console.log('fetchUserOrders: Using cached orders');
        const { orders, pagination } = JSON.parse(cached);
        setOrders(orders || []);
        setPagination(pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      console.log('fetchUserOrders: Fetching from API...', { page, limit, status });
      const response = await getUserOrders(page, limit, status);
      const { orders = [], total = 0, page: currentPage = 1, limit: currentLimit = 10, totalPages = 1 } = response.data || {};
      
      console.log('fetchUserOrders: API response:', { orders: orders.length, total });
      
      const filteredOrders = Array.isArray(orders) ? orders.filter(order => order && order.orderId) : [];
      setOrders(filteredOrders);
      setPagination({ total, page: currentPage, limit: currentLimit, totalPages });
      
      // Cache response only if not forcing refresh
      if (!forceRefresh) {
        localStorage.setItem(cacheKey, JSON.stringify({
          orders: filteredOrders,
          pagination: { total, page: currentPage, limit: currentLimit, totalPages }
        }));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      }
    } catch (err) {
      console.error('fetchUserOrders error:', err);
      await handleOrderError(err, isRegularUser, () => fetchUserOrders(page, limit, status, true));
    } finally {
      setLoading(false);
    }
  }, [isRegularUser, isAdmin, user?._id]);

  const fetchAllOrders = useCallback(async (page = 1, limit = 10, status = '', userId = '', forceRefresh = false) => {
    if (!isAdmin) {
      return;
    }

    const cacheKey = `orders_all_page_${page}_limit_${limit}_status_${status || 'all'}_user_${userId || 'all'}`;
    
    // Skip cache if forceRefresh is true
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 2 * 60 * 1000; // Reduced to 2 minutes

      if (cached && cacheValid) {
        console.log('fetchAllOrders: Using cached orders');
        const { orders, pagination } = JSON.parse(cached);
        setOrders(orders || []);
        setPagination(pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      console.log('fetchAllOrders: Fetching from API...', { page, limit, status, userId });
      const response = await getAllOrders(page, limit, status, userId);
      const { orders = [], total = 0, page: currentPage = 1, limit: currentLimit = 10, totalPages = 1 } = response.data || {};
      
      console.log('fetchAllOrders: API response:', { orders: orders.length, total });
      
      const filteredOrders = Array.isArray(orders) ? orders.filter(order => order && order.orderId) : [];
      setOrders(filteredOrders);
      setPagination({ total, page: currentPage, limit: currentLimit, totalPages });
      
      // Cache response only if not forcing refresh
      if (!forceRefresh) {
        localStorage.setItem(cacheKey, JSON.stringify({
          orders: filteredOrders,
          pagination: { total, page: currentPage, limit: currentLimit, totalPages }
        }));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      }
    } catch (err) {
      console.error('fetchAllOrders error:', err);
      await handleOrderError(err, isAdmin, () => fetchAllOrders(page, limit, status, userId, true));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const debouncedFetchUserOrders = useCallback(
    debounce((page, limit, status, forceRefresh = false) => {
      return fetchUserOrders(page, limit, status, forceRefresh);
    }, 500), // Reduced debounce time
    [fetchUserOrders]
  );

  const debouncedFetchAllOrders = useCallback(
    debounce((page, limit, status, userId, forceRefresh = false) => {
      return fetchAllOrders(page, limit, status, userId, forceRefresh);
    }, 500), // Reduced debounce time
    [fetchAllOrders]
  );

  useEffect(() => {
    if (!userRole) return;

    // Prevent multiple initializations
    const currentUserId = isAdmin ? admin?._id : user?._id;
    if (!currentUserId) return;

    console.log('OrderProvider: Setting up for role:', userRole, 'UserID:', currentUserId);

    // Add a small delay to prevent race conditions with auth initialization
    const setupTimer = setTimeout(() => {
      // Only fetch if we don't have recent data
      const lastFetchTime = isAdmin ? lastAdminFetch.current : lastUserFetch.current;
      const now = Date.now();
      const shouldFetch = !lastFetchTime || (now - lastFetchTime) > 30000; // 30 seconds

      if (shouldFetch) {
        console.log('OrderProvider: Fetching initial data');
        const fetchData = isAdmin ? 
          () => debouncedFetchAllOrders(1, 10, '', '', true) : 
          () => debouncedFetchUserOrders(1, 10, '', true);
        
        fetchData();
        
        // Update last fetch time
        if (isAdmin) {
          lastAdminFetch.current = now;
        } else {
          lastUserFetch.current = now;
        }
      } else {
        console.log('OrderProvider: Skipping fetch - recent data available');
      }
    }, 100); // Small delay to let auth settle

    let pollingInterval = null;

    if (isAdmin) {
      socketService.connect(currentUserId, 'admin');

      const handleSocketError = (error) => {
        console.error('Socket error:', error);
        setError('Failed to connect to real-time updates. Using fallback polling.');
        if (!pollingInterval) {
          pollingInterval = setInterval(() => {
            if (!socketService.getConnectionState()) {
              console.log('Polling: Fetching orders due to socket disconnect');
              debouncedFetchAllOrders(1, 10, '', '', true);
            }
          }, 15000);
        }
      };

      socketService.on('connect_error', handleSocketError);
      socketService.on('orderCreated', (newOrder) => {
        console.log('Socket: New order created:', newOrder);
        clearAllOrdersCache();
        debouncedFetchAllOrders(1, 10, '', '', true);
      });

      socketService.on('orderStatusUpdated', (updatedOrder) => {
        console.log('Socket: Order status updated:', updatedOrder);
        clearAllOrdersCache();
        debouncedFetchAllOrders(pagination.page || 1, pagination.limit || 10, '', '', true);
      });

      socketService.on('connect', () => {
        console.log('Socket: Connected successfully');
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
          setError('');
        }
      });

      socketService.on('disconnect', () => {
        console.log('Socket: Disconnected');
        if (!pollingInterval) {
          pollingInterval = setInterval(() => {
            console.log('Polling: Fetching orders due to socket disconnect');
            debouncedFetchAllOrders(1, 10, '', '', true);
          }, 15000);
        }
      });
    } else if (isRegularUser) {
      socketService.connect(currentUserId, 'user');
      
      socketService.on('orderCreated', (newOrder) => {
        console.log('Socket: User order created:', newOrder);
        clearUserOrdersCache();
        debouncedFetchUserOrders(1, 10, '', true);
      });

      socketService.on('orderStatusUpdated', (updatedOrder) => {
        console.log('Socket: User order status updated:', updatedOrder);
        clearUserOrdersCache();
        debouncedFetchUserOrders(pagination.page || 1, pagination.limit || 10, '', true);
      });
    }

    return () => {
      console.log('OrderProvider: Cleaning up...');
      clearTimeout(setupTimer);
      socketService.off('orderCreated');
      socketService.off('orderStatusUpdated');
      socketService.off('connect');
      socketService.off('connect_error');
      socketService.off('disconnect');
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      debouncedFetchUserOrders.cancel();
      debouncedFetchAllOrders.cancel();
    };
  }, [userRole, admin?._id, user?._id]); 

// Add these refs at the top of your component
const lastAdminFetch = useRef(0);
const lastUserFetch = useRef(0);

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

      console.log('Order placed successfully:', order);
      
      // Clear cache and force refresh
      clearAllOrdersCache();
      
      if (isAdmin) {
        await debouncedFetchAllOrders(1, 10, '', '', true);
      } else if (isRegularUser) {
        await debouncedFetchUserOrders(1, 10, '', true);
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
      console.log('Order status updated:', order);
      
      // Clear cache and force refresh
      clearAllOrdersCache();
      await debouncedFetchAllOrders(pagination.page || 1, pagination.limit || 10, '', '', true);
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
      console.log('Order cancelled:', order);
      
      // Clear cache and force refresh
      clearUserOrdersCache();
      await debouncedFetchUserOrders(pagination.page || 1, pagination.limit || 10, '', true);
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

  // Add a force refresh function
  const forceRefreshOrders = useCallback(() => {
    console.log('Force refreshing orders...');
    clearAllOrdersCache();
    if (isAdmin) {
      return debouncedFetchAllOrders(1, 10, '', '', true);
    } else if (isRegularUser) {
      return debouncedFetchUserOrders(1, 10, '', true);
    }
  }, [isAdmin, isRegularUser, debouncedFetchAllOrders, debouncedFetchUserOrders]);

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
    forceRefreshOrders, // Add this new function
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