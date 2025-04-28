import React, { createContext, useState, useEffect } from 'react';
import { placeOrder, getUserOrders, getAllOrders, updateOrderStatus, downloadInvoice } from '../services/orderService';
import socketService from '../services/socketService';

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const adminToken = localStorage.getItem('adminToken');

    if (userId) {
      socketService.connect(userId, adminToken ? 'admin' : 'user');
      if (adminToken) {
        fetchAllOrders();
      } else {
        fetchUserOrders();
      }
      socketService.on('orderCreated', () => (adminToken ? fetchAllOrders() : fetchUserOrders()));
      socketService.on('orderStatusUpdated', () => (adminToken ? fetchAllOrders() : fetchUserOrders()));
    }

    return () => {
      socketService.off('orderCreated');
      socketService.off('orderStatusUpdated');
      // socketService.disconnect(); // Optional, as above
    };
  }, []);

  const fetchUserOrders = async (page = 1, limit = 10) => {
    setLoading(true);
    setError('');
    try {
      const orderData = await getUserOrders(page, limit);
      setOrders(orderData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOrders = async (page = 1, limit = 10) => {
    setLoading(true);
    setError('');
    try {
      const orderData = await getAllOrders(page, limit);
      setOrders(orderData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const placeNewOrder = async (orderData) => {
    setLoading(true);
    setError('');
    try {
      const order = await placeOrder(orderData);
      await (localStorage.getItem('adminToken') ? fetchAllOrders() : fetchUserOrders());
      return order;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    setLoading(true);
    setError('');
    try {
      const order = await updateOrderStatus(orderId, status);
      await fetchAllOrders();
      return order;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const downloadOrderInvoice = async (orderId) => {
    setLoading(true);
    setError('');
    try {
      await downloadInvoice(orderId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    orders,
    loading,
    error,
    placeNewOrder,
    fetchUserOrders,
    fetchAllOrders,
    updateStatus,
    downloadOrderInvoice,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};