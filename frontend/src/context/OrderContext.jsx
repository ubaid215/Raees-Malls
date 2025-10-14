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
  getProductRevenue,
  checkPaymentStatus,
  retryPayment,
  handlePaymentReturn
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
  const [paymentStatus, setPaymentStatus] = useState({});
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

  // Enhanced validation with payment method support
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
      } else {
        const phoneRegex = /^(\+?\d{1,4}[\s-]?)?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}$/;
        if (!phoneRegex.test(phone)) {
          errors.push('Please enter a valid phone number (e.g., +923001234567, 03001234567, or 3001234567)');
        }
      }
    }
    
    // Payment method validation
    if (!orderData.paymentMethod) {
      errors.push('Payment method is required');
    } else if (!['cash_on_delivery', 'credit_card', 'alfa_wallet', 'alfalah_bank'].includes(orderData.paymentMethod)) {
      errors.push('Invalid payment method selected');
    }
    
    if (orderData.discountCode && !/^[A-Z0-9-]+$/i.test(orderData.discountCode)) {
      errors.push('Discount code can only contain letters, numbers, and hyphens');
    }
    
    return errors;
  };

  // Improved cache management
  const clearAllOrdersCache = useCallback(() => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('orders_') || key.includes('_orders_') || key.startsWith('notifications_') || key.startsWith('stats_') || key.startsWith('payment_')) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_timestamp`);
      }
    });
  }, []);

  const clearUserOrdersCache = useCallback(() => {
    if (user?._id) {
      Object.keys(localStorage).forEach(key => {
        if (key.includes(`user_${user._id}`) || key.startsWith(`payment_${user._id}`)) {
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}_timestamp`);
        }
      });
    }
  }, [user?._id]);

  // Payment-related functions
  const checkOrderPaymentStatus = useCallback(async (orderId, forceRefresh = false) => {
    if (!orderId) return null;

    const cacheKey = `payment_status_${orderId}`;
    
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 30 * 1000; // 30 seconds cache

      if (cached && cacheValid) {
        try {
          return JSON.parse(cached);
        } catch (parseError) {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`${cacheKey}_timestamp`);
        }
      }
    }

    try {
      const response = await checkPaymentStatus(orderId);
      const paymentData = response.data;
      
      // Update payment status state
      setPaymentStatus(prev => ({
        ...prev,
        [orderId]: paymentData
      }));

      // Cache the response
      if (!forceRefresh) {
        localStorage.setItem(cacheKey, JSON.stringify(paymentData));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      }

      return paymentData;
    } catch (err) {
      console.error('checkOrderPaymentStatus error:', err);
      throw err;
    }
  }, []);

  const retryOrderPayment = async (orderId) => {
    if (!isRegularUser) {
      const errorMessage = 'Unauthorized: Only users can retry payments';
      setError(errorMessage);
      toastError(errorMessage, { position: "top-right", autoClose: 3000 });
      throw new Error(errorMessage);
    }

    setLoading(true);
    setError('');

    try {
      const response = await retryPayment(orderId);
      const { order, payment } = response.data;

      // Clear payment cache
      localStorage.removeItem(`payment_status_${orderId}`);
      localStorage.removeItem(`payment_status_${orderId}_timestamp`);

      toastSuccess('Payment retry initiated', { position: "top-right", autoClose: 3000 });

      // Handle payment redirection based on method
      if (payment) {
        if (order.paymentMethod === 'credit_card') {
          // Redirect to payment gateway with form data
          redirectToPaymentGateway(payment.redirectUrl, payment.formData);
        } else {
          // Redirect to API payment page
          window.location.href = payment.paymentUrl;
        }
      }

      return { order, payment };
    } catch (err) {
      console.error('retryOrderPayment error:', err);
      await handleOrderError(err, isRegularUser, () => retryOrderPayment(orderId));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentReturnFromGateway = async (queryParams) => {
    try {
      const response = await handlePaymentReturn(queryParams);
      const { order, paymentDetails } = response.data;

      // Clear relevant caches
      clearUserOrdersCache();
      localStorage.removeItem(`payment_status_${order.orderId}`);
      
      // Update local state
      if (paymentDetails.responseCode === '00') {
        toastSuccess('Payment completed successfully!', { position: "top-right", autoClose: 5000 });
      } else {
        toastError(`Payment failed: ${paymentDetails.message}`, { position: "top-right", autoClose: 5000 });
      }

      return response.data;
    } catch (err) {
      console.error('handlePaymentReturnFromGateway error:', err);
      toastError('Error processing payment return', { position: "top-right", autoClose: 5000 });
      throw err;
    }
  };

  // Helper function to redirect to payment gateway
  const redirectToPaymentGateway = (redirectUrl, formData) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = redirectUrl;
    form.style.display = 'none';

    Object.keys(formData).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = formData[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  // Enhanced socket reconnection logic
  const handleSocketReconnect = useCallback(() => {
    if (!socketService.getConnectionState()) {
      const currentUserId = isAdmin ? admin?._id : user?._id;
      if (currentUserId) {
        socketService.connect(currentUserId, isAdmin ? 'admin' : 'user');
      }
    }
  }, [isAdmin, admin?._id, user?._id]);

  // Payment socket event handlers
  const setupPaymentSocketHandlers = useCallback(() => {
    if (isRegularUser && user?._id) {
      socketService.on('paymentSuccess', (data) => {
        console.log('Payment success received:', data);
        const { order } = data;
        
        // Update local orders state
        setOrders(prev => prev.map(ord => 
          ord.orderId === order.orderId ? { ...ord, ...order } : ord
        ));
        
        // Update payment status
        setPaymentStatus(prev => ({
          ...prev,
          [order.orderId]: { ...prev[order.orderId], paymentStatus: 'completed' }
        }));

        // Clear cache
        localStorage.removeItem(`payment_status_${order.orderId}`);
        clearUserOrdersCache();

        toastSuccess(`Payment completed for order ${order.orderId}`, {
          position: "top-right",
          autoClose: 5000,
        });
      });

      socketService.on('paymentFailed', (data) => {
        console.log('Payment failure received:', data);
        const { order, message } = data;
        
        // Update payment status
        setPaymentStatus(prev => ({
          ...prev,
          [order.orderId]: { 
            ...prev[order.orderId], 
            paymentStatus: 'failed',
            error: message
          }
        }));

        toastError(`Payment failed: ${message}`, {
          position: "top-right",
          autoClose: 5000,
        });
      });
    }
  }, [isRegularUser, user?._id, clearUserOrdersCache]);

  const fetchUserOrders = useCallback(async (page = 1, limit = 10, status = '', forceRefresh = false) => {
    if (!isRegularUser && !isAdmin) {
      return;
    }

    const cacheKey = generateCacheKey('user', user?._id, page, limit, status);
    
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 2 * 60 * 1000;

      if (cached && cacheValid) {
        try {
          const { orders, pagination } = JSON.parse(cached);
          setOrders(orders || []);
          setPagination(pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
          return;
        } catch (parseError) {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`${cacheKey}_timestamp`);
        }
      }
    }

    setLoading(true);
    setError('');
    try {
      const response = await getUserOrders(page, limit, status);
      const { orders = [], total = 0, page: currentPage = 1, limit: currentLimit = 10, totalPages = 1 } = response.data || {};
      
      const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
        return order && (order.orderId || order._id) && order.items && Array.isArray(order.items);
      }) : [];
      
      setOrders(filteredOrders);
      setPagination({ total, page: currentPage, limit: currentLimit, totalPages });
      
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
    
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 2 * 60 * 1000;

      if (cached && cacheValid) {
        try {
          const { orders, pagination } = JSON.parse(cached);
          setOrders(orders || []);
          setPagination(pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
          return;
        } catch (parseError) {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`${cacheKey}_timestamp`);
        }
      }
    }

    setLoading(true);
    setError('');
    try {
      const response = await getAllOrders(page, limit, status, userId);
      const { orders = [], total = 0, page: currentPage = 1, limit: currentLimit = 10, totalPages = 1 } = response.data || {};
      
      const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
        return order && order.orderId && order.items && Array.isArray(order.items);
      }) : [];
      
      setOrders(filteredOrders);
      setPagination({ total, page: currentPage, limit: currentLimit, totalPages });
      
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
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 1 * 60 * 1000;

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
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 5 * 60 * 1000;

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
      const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 5 * 60 * 1000;

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

  // Enhanced useEffect with payment socket handlers
  useEffect(() => {
    if (!userRole || initializationRef.current) return;

    const currentUserId = isAdmin ? admin?._id : user?._id;
    if (!currentUserId) return;

    initializationRef.current = true;

    const setupTimer = setTimeout(() => {
      const lastFetchTime = isAdmin ? lastAdminFetch.current : lastUserFetch.current;
      const now = Date.now();
      const shouldFetch = !lastFetchTime || (now - lastFetchTime) > 30000;

      if (shouldFetch) {
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

    // Enhanced socket setup with payment handlers
    if (isAdmin) {
      socketService.connect(currentUserId, 'admin');

      const handleSocketError = (error) => {
        console.error('Socket error:', error);
        setError('Connection issues detected. Using backup sync.');
        if (!pollingInterval) {
          pollingInterval = setInterval(() => {
            if (!socketService.getConnectionState()) {
              debouncedFetchAllOrders(1, 10, '', '', true);
              fetchNotifications(5, true);
            }
          }, 15000);
        }
      };

      socketService.on('connect_error', handleSocketError);
      
      socketService.on('orderNotification', (notification) => {
        setNotifications(prev => [notification, ...prev.slice(0, 4)]);
      });

      socketService.on('newOrder', (data) => {
        clearAllOrdersCache();
        debouncedFetchAllOrders(1, 10, '', '', true);
        fetchNotifications(5, true);
        fetchRevenueStats('month', '', '', true);
        fetchProductStats(10, '', '', true);
        
        toastSuccess(`New order received: ${data.order?.orderId}`, {
          position: "top-right",
          autoClose: 5000,
        });
      });

      socketService.on('orderStatusUpdated', (updatedOrder) => {
        clearAllOrdersCache();
        debouncedFetchAllOrders(pagination.page || 1, pagination.limit || 10, '', '', true);
        
        setOrders(prev => prev.map(order => 
          order.orderId === updatedOrder.orderId ? { ...order, ...updatedOrder } : order
        ));
      });

      socketService.on('connect', () => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
          setError('');
        }
      });

      socketService.on('disconnect', () => {
        if (!pollingInterval) {
          pollingInterval = setInterval(() => {
            debouncedFetchAllOrders(1, 10, '', '', true);
            fetchNotifications(5, true);
          }, 15000);
        }
      });

    } else if (isRegularUser) {
      socketService.connect(currentUserId, 'user');
      
      // Setup payment socket handlers
      setupPaymentSocketHandlers();
      
      socketService.on('orderStatusUpdated', (updatedOrder) => {
        if (updatedOrder.userId === currentUserId) {
          clearUserOrdersCache();
          debouncedFetchUserOrders(pagination.page || 1, pagination.limit || 10, '', true);
          
          setOrders(prev => prev.map(order => 
            order.orderId === updatedOrder.orderId ? { ...order, ...updatedOrder } : order
          ));
          
          toastInfo(`Order ${updatedOrder.orderId} status updated to: ${updatedOrder.status}`, {
            position: "top-right",
            autoClose: 4000,
          });
        }
      });
    }

    return () => {
      clearTimeout(setupTimer);
      socketService.off('orderNotification');
      socketService.off('newOrder');
      socketService.off('orderStatusUpdated');
      socketService.off('paymentSuccess');
      socketService.off('paymentFailed');
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
  }, [userRole, admin?._id, user?._id, pagination.page, pagination.limit, setupPaymentSocketHandlers]);

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
      const response = await placeOrder(orderData);
      const { order, payment } = response.data;

      toastSuccess('Order placed successfully!', { position: "top-right", autoClose: 3000 });
      
      // Clear cache
      clearAllOrdersCache();
      
      // Handle payment redirection for online payments
      if (order.paymentMethod !== 'cash_on_delivery' && payment) {
        if (order.paymentMethod === 'credit_card') {
          // Redirect to payment gateway with form data
          redirectToPaymentGateway(payment.redirectUrl, payment.formData);
        } else {
          // Redirect to API payment page
          window.location.href = payment.paymentUrl;
        }
        
        // Return both order and payment for handling redirection
        return { order, payment };
      }
      
      // For COD orders, refresh orders list
      if (isAdmin) {
        await debouncedFetchAllOrders(1, 10, '', '', true);
        fetchNotifications(5, true);
        fetchRevenueStats('month', '', '', true);
        fetchProductStats(10, '', '', true);
      } else if (isRegularUser) {
        await debouncedFetchUserOrders(1, 10, '', true);
      }
      
      return { order, payment: null };
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
      toastSuccess(`Order status updated to: ${status}`, { position: "top-right", autoClose: 3000 });
      
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
    paymentStatus,
    placeNewOrder,
    fetchUserOrders: debouncedFetchUserOrders,
    fetchAllOrders: debouncedFetchAllOrders,
    fetchNotifications,
    fetchRevenueStats,
    fetchProductStats,
    checkOrderPaymentStatus,
    retryOrderPayment,
    handlePaymentReturnFromGateway,
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