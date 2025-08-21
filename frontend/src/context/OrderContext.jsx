import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { debounce } from 'lodash';
import { useAdminAuth } from './AdminAuthContext';
import { useAuth } from './AuthContext';
import { 
  placeOrder, 
  getUserOrders, 
  getAllOrders, 
  updateOrderStatus, 
  downloadInvoice, 
  cancelOrder as apiCancelOrder,
  getRecentOrderNotifications,
  getRevenueStats,
  getProductRevenue
} from '../services/orderService';
import socketService from '../services/socketService';
import { useToast } from './ToastContext';

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const { admin, isAdminAuthenticated, refreshAdminToken } = useAdminAuth();
  const { user, isAuthenticated, refreshToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [revenueStats, setRevenueStats] = useState(null);
  const [productStats, setProductStats] = useState([]);
  const { success: toastSuccess, error: toastError, warning: toastWarn, info: toastInfo } = useToast();

  // Add these refs for preventing multiple fetches
  const lastAdminFetch = useRef(0);
  const lastUserFetch = useRef(0);
  const initializationRef = useRef(false);

  const isAdmin = isAdminAuthenticated && admin && (admin.role === 'admin' || admin.role === 'administrator');
  const isRegularUser = isAuthenticated && user && user.role === 'user';
  const userRole = isAdmin ? admin.role : (isRegularUser ? user.role : null);

  // Improved cache key generation
  const generateCacheKey = useCallback((type, userId, page, limit, status, extraParams = '') => {
    return `orders_${type}_${userId || 'all'}_p${page}_l${limit}_s${status || 'all'}${extraParams}`;
  }, []);

  // Enhanced validation with better error messages
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
        if (item.variantType && !['simple', 'color', 'storage', 'size'].includes(item.variantType)) {
          errors.push(`Item ${index + 1}: Invalid variant type`);
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

  // Improved cache management
  const clearAllOrdersCache = useCallback(() => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('orders_') || key.includes('_orders_') || key.startsWith('notifications_') || key.startsWith('stats_')) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_timestamp`);
      }
    });
  }, []);

  const clearUserOrdersCache = useCallback(() => {
    if (user?._id) {
      Object.keys(localStorage).forEach(key => {
        if (key.includes(`user_${user._id}`)) {
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}_timestamp`);
        }
      });
    }
  }, [user?._id]);

  // Enhanced socket reconnection logic
  const handleSocketReconnect = useCallback(() => {
    if (!socketService.getConnectionState()) {
      const currentUserId = isAdmin ? admin?._id : user?._id;
      if (currentUserId) {
        socketService.connect(currentUserId, isAdmin ? 'admin' : 'user');
      }
    }
  }, [isAdmin, admin?._id, user?._id]);

  const fetchUserOrders = useCallback(async (page = 1, limit = 10, status = '', forceRefresh = false) => {
    if (!isRegularUser && !isAdmin) {
      return;
    }

    const cacheKey = generateCacheKey('user', user?._id, page, limit, status);
    
    // Skip cache if forceRefresh is true
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 2 * 60 * 1000;

      if (cached && cacheValid) {
        try {
          // console.log('fetchUserOrders: Using cached orders');
          const { orders, pagination } = JSON.parse(cached);
          setOrders(orders || []);
          setPagination(pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
          return;
        } catch (parseError) {
          console.warn('Failed to parse cached orders:', parseError);
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`${cacheKey}_timestamp`);
        }
      }
    }

    setLoading(true);
    setError('');
    try {
      // console.log('fetchUserOrders: Fetching from API...', { page, limit, status });
      const response = await getUserOrders(page, limit, status);
      const { orders = [], total = 0, page: currentPage = 1, limit: currentLimit = 10, totalPages = 1 } = response.data || {};
      
      // console.log('fetchUserOrders: API response:', { orders: orders.length, total });
      
      // Improved order filtering
      const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
        return order && (order.orderId || order._id) && order.items && Array.isArray(order.items);
      }) : [];
      
      setOrders(filteredOrders);
      setPagination({ total, page: currentPage, limit: currentLimit, totalPages });
      
      // Cache response only if not forcing refresh
      if (!forceRefresh && filteredOrders.length > 0) {
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
  }, [isRegularUser, isAdmin, user?._id, generateCacheKey]);

  const fetchAllOrders = useCallback(async (page = 1, limit = 10, status = '', userId = '', forceRefresh = false) => {
    if (!isAdmin) {
      return;
    }

    const cacheKey = generateCacheKey('all', 'admin', page, limit, status, `_user_${userId || 'all'}`);
    
    // Skip cache if forceRefresh is true
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 2 * 60 * 1000;

      if (cached && cacheValid) {
        try {
          // console.log('fetchAllOrders: Using cached orders');
          const { orders, pagination } = JSON.parse(cached);
          setOrders(orders || []);
          setPagination(pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
          return;
        } catch (parseError) {
          console.warn('Failed to parse cached orders:', parseError);
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`${cacheKey}_timestamp`);
        }
      }
    }

    setLoading(true);
    setError('');
    try {
      // console.log('fetchAllOrders: Fetching from API...', { page, limit, status, userId });
      const response = await getAllOrders(page, limit, status, userId);
      const { orders = [], total = 0, page: currentPage = 1, limit: currentLimit = 10, totalPages = 1 } = response.data || {};
      
      // console.log('fetchAllOrders: API response:', { orders: orders.length, total });
      
      // Improved order filtering
      const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
        return order && order.orderId && order.items && Array.isArray(order.items);
      }) : [];
      
      setOrders(filteredOrders);
      setPagination({ total, page: currentPage, limit: currentLimit, totalPages });
      
      // Cache response only if not forcing refresh
      if (!forceRefresh && filteredOrders.length > 0) {
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
  }, [isAdmin, generateCacheKey]);

  // New function to fetch notifications
  const fetchNotifications = useCallback(async (limit = 5, forceRefresh = false) => {
    if (!isAdmin) return;

    const cacheKey = `notifications_recent_${limit}`;
    
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 1 * 60 * 1000; // 1 minute cache

      if (cached && cacheValid) {
        try {
          const { notifications } = JSON.parse(cached);
          setNotifications(notifications || []);
          return;
        } catch (parseError) {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`${cacheKey}_timestamp`);
        }
      }
    }

    try {
      const response = await getRecentOrderNotifications(limit);
      const notifications = response.data?.notifications || [];
      setNotifications(notifications);
      
      if (!forceRefresh) {
        localStorage.setItem(cacheKey, JSON.stringify({ notifications }));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      }
    } catch (err) {
      console.error('fetchNotifications error:', err);
    }
  }, [isAdmin]);

  // New function to fetch revenue stats
  const fetchRevenueStats = useCallback(async (period = 'month', startDate = '', endDate = '', forceRefresh = false) => {
    if (!isAdmin) return;

    const cacheKey = `stats_revenue_${period}_${startDate}_${endDate}`;
    
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 5 * 60 * 1000; // 5 minutes cache

      if (cached && cacheValid) {
        try {
          const { stats } = JSON.parse(cached);
          setRevenueStats(stats);
          return;
        } catch (parseError) {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`${cacheKey}_timestamp`);
        }
      }
    }

    try {
      const response = await getRevenueStats(period, startDate, endDate);
      const stats = response.data?.stats || null;
      setRevenueStats(stats);
      
      if (!forceRefresh) {
        localStorage.setItem(cacheKey, JSON.stringify({ stats }));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      }
    } catch (err) {
      console.error('fetchRevenueStats error:', err);
    }
  }, [isAdmin]);

  // New function to fetch product revenue stats
  const fetchProductStats = useCallback(async (limit = 10, startDate = '', endDate = '', forceRefresh = false) => {
    if (!isAdmin) return;

    const cacheKey = `stats_products_${limit}_${startDate}_${endDate}`;
    
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 5 * 60 * 1000; // 5 minutes cache

      if (cached && cacheValid) {
        try {
          const { products } = JSON.parse(cached);
          setProductStats(products || []);
          return;
        } catch (parseError) {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`${cacheKey}_timestamp`);
        }
      }
    }

    try {
      const response = await getProductRevenue(limit, startDate, endDate);
      const products = response.data?.products || [];
      setProductStats(products);
      
      if (!forceRefresh) {
        localStorage.setItem(cacheKey, JSON.stringify({ products }));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      }
    } catch (err) {
      console.error('fetchProductStats error:', err);
    }
  }, [isAdmin]);

  const debouncedFetchUserOrders = useCallback(
    debounce((page, limit, status, forceRefresh = false) => {
      return fetchUserOrders(page, limit, status, forceRefresh);
    }, 300),
    [fetchUserOrders]
  );

  const debouncedFetchAllOrders = useCallback(
    debounce((page, limit, status, userId, forceRefresh = false) => {
      return fetchAllOrders(page, limit, status, userId, forceRefresh);
    }, 300),
    [fetchAllOrders]
  );

  // Enhanced useEffect with better initialization control
  useEffect(() => {
    if (!userRole || initializationRef.current) return;

    const currentUserId = isAdmin ? admin?._id : user?._id;
    if (!currentUserId) return;

    // console.log('OrderProvider: Setting up for role:', userRole, 'UserID:', currentUserId);
    initializationRef.current = true;

    const setupTimer = setTimeout(() => {
      const lastFetchTime = isAdmin ? lastAdminFetch.current : lastUserFetch.current;
      const now = Date.now();
      const shouldFetch = !lastFetchTime || (now - lastFetchTime) > 30000;

      if (shouldFetch) {
        // console.log('OrderProvider: Fetching initial data');
        
        if (isAdmin) {
          debouncedFetchAllOrders(1, 10, '', '', true);
          fetchNotifications(5, true);
          fetchRevenueStats('month', '', '', true);
          fetchProductStats(10, '', '', true);
          lastAdminFetch.current = now;
        } else {
          debouncedFetchUserOrders(1, 10, '', true);
          lastUserFetch.current = now;
        }
      }
    }, 100);

    let pollingInterval = null;

    // Enhanced socket setup
    if (isAdmin) {
      socketService.connect(currentUserId, 'admin');

      const handleSocketError = (error) => {
        console.error('Socket error:', error);
        setError('Connection issues detected. Using backup sync.');
        if (!pollingInterval) {
          pollingInterval = setInterval(() => {
            if (!socketService.getConnectionState()) {
              // console.log('Polling: Fetching orders due to socket disconnect');
              debouncedFetchAllOrders(1, 10, '', '', true);
              fetchNotifications(5, true);
            }
          }, 15000);
        }
      };

      // Enhanced socket event handlers
      socketService.on('connect_error', handleSocketError);
      
      socketService.on('orderNotification', (notification) => {
        // console.log('Socket: Order notification received:', notification);
        setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep latest 5
      });

      socketService.on('newOrder', (data) => {
        // console.log('Socket: New order received:', data);
        clearAllOrdersCache();
        debouncedFetchAllOrders(1, 10, '', '', true);
        fetchNotifications(5, true);
        fetchRevenueStats('month', '', '', true);
        fetchProductStats(10, '', '', true);
        
        // Show toast notification
        toastSuccess(`New order received: ${data.order?.orderId}`, {
          position: "top-right",
          autoClose: 5000,
        });
      });

      socketService.on('orderStatusUpdated', (updatedOrder) => {
        // console.log('Socket: Order status updated:', updatedOrder);
        clearAllOrdersCache();
        debouncedFetchAllOrders(pagination.page || 1, pagination.limit || 10, '', '', true);
        
        // Update local state optimistically
        setOrders(prev => prev.map(order => 
          order.orderId === updatedOrder.orderId ? { ...order, ...updatedOrder } : order
        ));
      });

      socketService.on('connect', () => {
        // console.log('Socket: Connected successfully');
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
          setError('');
        }
      });

      socketService.on('disconnect', () => {
        // console.log('Socket: Disconnected');
        if (!pollingInterval) {
          pollingInterval = setInterval(() => {
            // console.log('Polling: Fetching data due to socket disconnect');
            debouncedFetchAllOrders(1, 10, '', '', true);
            fetchNotifications(5, true);
          }, 15000);
        }
      });

    } else if (isRegularUser) {
      socketService.connect(currentUserId, 'user');
      
      socketService.on('orderStatusUpdated', (updatedOrder) => {
        // console.log('Socket: User order status updated:', updatedOrder);
        if (updatedOrder.userId === currentUserId) {
          clearUserOrdersCache();
          debouncedFetchUserOrders(pagination.page || 1, pagination.limit || 10, '', true);
          
          // Update local state optimistically
          setOrders(prev => prev.map(order => 
            order.orderId === updatedOrder.orderId ? { ...order, ...updatedOrder } : order
          ));
          
          // Show user notification
          toastInfo(`Order ${updatedOrder.orderId} status updated to: ${updatedOrder.status}`, {
            position: "top-right",
            autoClose: 4000,
          });
        }
      });
    }

    return () => {
      // console.log('OrderProvider: Cleaning up...');
      clearTimeout(setupTimer);
      socketService.off('orderNotification');
      socketService.off('newOrder');
      socketService.off('orderStatusUpdated');
      socketService.off('connect');
      socketService.off('connect_error');
      socketService.off('disconnect');
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      debouncedFetchUserOrders.cancel();
      debouncedFetchAllOrders.cancel();
      initializationRef.current = false;
    };
  }, [userRole, admin?._id, user?._id, pagination.page, pagination.limit]);

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
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred while processing the request';
      setError(errorMessage);
      toastError(errorMessage, { position: "top-right", autoClose: 5000 });
      throw err;
    }
  };

  const placeNewOrder = async (orderData) => {
    setLoading(true);
    setError('');
    
    const validationErrors = validateOrderData(orderData);
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join(', ');
      setError(errorMessage);
      setLoading(false);
      toastError(errorMessage, { position: "top-right", autoClose: 5000 });
      throw new Error(errorMessage);
    }

    try {
      const order = await placeOrder({
        ...orderData,
        items: orderData.items.map(item => ({
          ...item,
          productId: String(item.productId),
        })),
      });

      // console.log('Order placed successfully:', order);
      toastSuccess('Order placed successfully!', { position: "top-right", autoClose: 3000 });
      
      // Clear cache and force refresh
      clearAllOrdersCache();
      
      if (isAdmin) {
        await debouncedFetchAllOrders(1, 10, '', '', true);
        fetchNotifications(5, true);
        fetchRevenueStats('month', '', '', true);
        fetchProductStats(10, '', '', true);
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
      const errorMessage = 'Unauthorized: Only admins can update order status';
      setError(errorMessage);
      toastError(errorMessage, { position: "top-right", autoClose: 3000 });
      throw new Error(errorMessage);
    }
    
    setLoading(true);
    setError('');
    
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      const errorMessage = 'Invalid status value';
      setError(errorMessage);
      setLoading(false);
      toastError(errorMessage, { position: "top-right", autoClose: 3000 });
      throw new Error(errorMessage);
    }
    
    if (!orderId || typeof orderId !== 'string') {
      const errorMessage = 'Invalid order ID';
      setError(errorMessage);
      setLoading(false);
      toastError(errorMessage, { position: "top-right", autoClose: 3000 });
      throw new Error(errorMessage);
    }

    try {
      const order = await updateOrderStatus(orderId, status);
      // console.log('Order status updated:', order);
      toastSuccess(`Order status updated to: ${status}`, { position: "top-right", autoClose: 3000 });
      
      // Clear cache and force refresh
      clearAllOrdersCache();
      await debouncedFetchAllOrders(pagination.page || 1, pagination.limit || 10, '', '', true);
      fetchNotifications(5, true);
      
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
      const errorMessage = 'Unauthorized: Only users can cancel their own orders';
      setError(errorMessage);
      toastError(errorMessage, { position: "top-right", autoClose: 3000 });
      throw new Error(errorMessage);
    }
    
    setLoading(true);
    setError('');
    
    if (!orderId || typeof orderId !== 'string') {
      const errorMessage = 'Invalid order ID';
      setError(errorMessage);
      setLoading(false);
      toastError(errorMessage, { position: "top-right", autoClose: 3000 });
      throw new Error(errorMessage);
    }

    try {
      const order = await apiCancelOrder(orderId);
      // console.log('Order cancelled:', order);
      
      // Clear cache and force refresh
      clearUserOrdersCache();
      await debouncedFetchUserOrders(pagination.page || 1, pagination.limit || 10, '', true);
      toastSuccess('Order cancelled successfully', { position: "top-right", autoClose: 3000 });
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
      const errorMessage = 'Unauthorized: Please log in to download invoices';
      setError(errorMessage);
      toastError(errorMessage, { position: "top-right", autoClose: 3000 });
      throw new Error(errorMessage);
    }
    
    setLoading(true);
    setError('');
    
    if (!orderId || typeof orderId !== 'string') {
      const errorMessage = 'Invalid order ID';
      setError(errorMessage);
      setLoading(false);
      toastError(errorMessage, { position: "top-right", autoClose: 3000 });
      throw new Error(errorMessage);
    }

    try {
      const response = await downloadInvoice(orderId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toastSuccess('Invoice downloaded successfully', { position: "top-right", autoClose: 3000 });
      return response;
    } catch (err) {
      await handleOrderError(err, isRegularUser || isAdmin, () => downloadOrderInvoice(orderId));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Enhanced force refresh function
  const forceRefreshOrders = useCallback(() => {
    // console.log('Force refreshing orders...');
    clearAllOrdersCache();
    if (isAdmin) {
      debouncedFetchAllOrders(1, 10, '', '', true);
      fetchNotifications(5, true);
      fetchRevenueStats('month', '', '', true);
      fetchProductStats(10, '', '', true);
    } else if (isRegularUser) {
      debouncedFetchUserOrders(1, 10, '', true);
    }
  }, [isAdmin, isRegularUser, debouncedFetchAllOrders, debouncedFetchUserOrders, fetchNotifications, fetchRevenueStats, fetchProductStats]);

  const value = {
    orders,
    pagination,
    loading,
    error,
    notifications,
    revenueStats,
    productStats,
    placeNewOrder,
    fetchUserOrders: debouncedFetchUserOrders,
    fetchAllOrders: debouncedFetchAllOrders,
    fetchNotifications,
    fetchRevenueStats,
    fetchProductStats,
    updateStatus,
    cancelOrder: cancelUserOrder,
    downloadOrderInvoice,
    forceRefreshOrders,
    clearAllOrdersCache,
    clearUserOrdersCache,
    handleSocketReconnect,
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