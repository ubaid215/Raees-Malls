import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { createReview, getReviews } from '../services/reviewService';
import socketService from '../services/socketService';

// Debounce utility
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const ReviewContext = createContext();

export const ReviewProvider = ({ children }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounced fetchReviews
  const fetchReviews = useCallback(debounce(async (productId, page = 1, limit = 10, sort = 'recent', filter = 'all') => {
    setLoading(true);
    setError('');
    try {
      const reviewData = await getReviews(productId, page, limit, sort, filter);
      setReviews(reviewData.reviews);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, 300), []);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const adminToken = localStorage.getItem('adminToken');

    if (userId) {
      socketService.connect(userId, adminToken ? 'admin' : 'user');
      socketService.on('reviewAdded', ({ productId }) => fetchReviews(productId));
    }

    return () => {
      socketService.off('reviewAdded');
      // socketService.disconnect(); // Optional
    };
  }, [fetchReviews]);

  const addReview = async (productId, orderId, rating, comment) => {
    setLoading(true);
    setError('');
    try {
      const review = await createReview(productId, orderId, rating, comment);
      await fetchReviews(productId);
      return review;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    reviews,
    loading,
    error,
    fetchReviews,
    addReview,
  };

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
};

// Custom hook to access ReviewContext
export const useReview = () => {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return context;
};