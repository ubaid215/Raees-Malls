import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { createReview, getReviews } from '../services/reviewService';
import socketService from '../services/socketService';
import { useToast } from './ToastContext';

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
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  // Debounced fetchReviews - now returns the full response
  const fetchReviews = useCallback(debounce(async (productId, page = 1, limit = 10, sort = 'recent', filter = 'all') => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching reviews for productId:', productId);
      const response = await getReviews(productId, page, limit, sort, filter);
      console.log('Review service response:', response);
      
      // Set both individual reviews and full response data
      setReviews(response.reviews || []);
      setReviewData(response);
      
      return response; // Return the full response
    } catch (err) {
      console.error('Error in fetchReviews:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch reviews';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw so calling code can handle it
    } finally {
      setLoading(false);
    }
  }, 300), [toast]);

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
      // Refresh reviews after adding
      await fetchReviews(productId);
      toast.success('Review submitted successfully');
      return review;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit review';
      setError(errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    reviews,
    reviewData, // Add full review data to context
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