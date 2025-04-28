import React, { createContext, useState, useEffect } from 'react';
import { applyDiscount, createDiscount, getDiscounts, getDiscountById, updateDiscount, deleteDiscount } from '../services/discountService';
import socketService from '../services/socketService';

export const DiscountContext = createContext();

export const DiscountProvider = ({ children }) => {
  const [discounts, setDiscounts] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const userId = localStorage.getItem('userId');

    // Connect to socket with userId and role
    if (userId) {
      socketService.connect(userId, adminToken ? 'admin' : 'user');
    }

    if (adminToken) {
      fetchDiscounts();
      socketService.on('discountCreated', fetchDiscounts);
    }
    socketService.on('discountApplied', (data) => setAppliedDiscount(data));

    return () => {
      socketService.off('discountCreated', fetchDiscounts);
      socketService.off('discountApplied');
      // Optionally disconnect if no other components need the socket
      // socketService.disconnect();
    };
  }, []);

  const fetchDiscounts = async (page = 1, limit = 10, isActive = undefined) => {
    setLoading(true);
    setError('');
    try {
      const discountData = await getDiscounts(page, limit, isActive);
      setDiscounts(discountData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyDiscountCode = async (code, orderTotal, productIds) => {
    setLoading(true);
    setError('');
    try {
      const discount = await applyDiscount(code, orderTotal, productIds);
      setAppliedDiscount(discount);
      return discount;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createNewDiscount = async (discountData) => {
    setLoading(true);
    setError('');
    try {
      const discount = await createDiscount(discountData);
      await fetchDiscounts();
      return discount;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getDiscount = async (id) => {
    setLoading(true);
    setError('');
    try {
      return await getDiscountById(id);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateExistingDiscount = async (id, discountData) => {
    setLoading(true);
    setError('');
    try {
      const discount = await updateDiscount(id, discountData);
      await fetchDiscounts();
      return discount;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteExistingDiscount = async (id) => {
    setLoading(true);
    setError('');
    try {
      await deleteDiscount(id);
      await fetchDiscounts();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    discounts,
    appliedDiscount,
    loading,
    error,
    applyDiscountCode,
    createNewDiscount,
    getDiscount,
    updateExistingDiscount,
    deleteExistingDiscount,
    fetchDiscounts,
  };

  return <DiscountContext.Provider value={value}>{children}</DiscountContext.Provider>;
};