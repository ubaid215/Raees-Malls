import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  applyDiscount,
  createDiscount,
  getDiscounts,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
} from '../services/discountService';
import socketService from '../services/socketService';

export const DiscountContext = createContext();

export const DiscountProvider = ({ children }) => {
  const [discounts, setDiscounts] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTimeoutRef = useRef(null);
  const cacheRef = useRef({ data: null, timestamp: null });

  const debounce = (func, delay, timeoutRef) => {
    return (...args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      return new Promise((resolve, reject) => {
        timeoutRef.current = setTimeout(async () => {
          try {
            const result = await func(...args);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        }, delay);
      });
    };
  };

  const fetchDiscountsOriginal = async (page = 1, limit = 10, isActive = undefined, force = false) => {
    const now = Date.now();
    const cacheDuration = 5 * 60 * 1000; // 5 minutes

    // Use cache if available and not expired
    if (!force && cacheRef.current.data && now - cacheRef.current.timestamp < cacheDuration) {
      return cacheRef.current.data;
    }

    setLoading(true);
    setError('');
    try {
      const data = await getDiscounts(page, limit, isActive);
      setDiscounts(data);
      cacheRef.current = {
        data,
        timestamp: now,
      };
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
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
      cacheRef.current = { data: null, timestamp: null }; // Invalidate cache
      await fetchDiscountsOriginal(1, 10, undefined, true);
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
      cacheRef.current = { data: null, timestamp: null }; // Invalidate cache
      await fetchDiscountsOriginal(1, 10, undefined, true);
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
      cacheRef.current = { data: null, timestamp: null }; // Invalidate cache
      await fetchDiscountsOriginal(1, 10, undefined, true);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetchDiscounts = useCallback(
    debounce(fetchDiscountsOriginal, 300, fetchTimeoutRef),
    []
  );

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const userId = localStorage.getItem('userId');

    if (userId) {
      socketService.connect(userId, adminToken ? 'admin' : 'user');
    }

    if (adminToken) {
      fetchDiscountsOriginal(); // initial fetch
      socketService.on('discountCreated', () => debouncedFetchDiscounts());
    }

    socketService.on('discountApplied', (data) => setAppliedDiscount(data));

    return () => {
      socketService.off('discountCreated', debouncedFetchDiscounts);
      socketService.off('discountApplied');
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [debouncedFetchDiscounts]);

  return (
    <DiscountContext.Provider
      value={{
        discounts,
        appliedDiscount,
        loading,
        error,
        fetchDiscounts: debouncedFetchDiscounts,
        applyDiscountCode,
        createNewDiscount,
        getDiscount,
        updateExistingDiscount,
        deleteExistingDiscount,
      }}
    >
      {children}
    </DiscountContext.Provider>
  );
};
