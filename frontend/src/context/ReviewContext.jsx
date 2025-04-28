import React, { createContext, useState, useEffect } from 'react';
import { createReview, getReviews } from '../services/reviewService';
import socketService from '../services/socketService';

export const ReviewContext = createContext();

export const ReviewProvider = ({ children }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
  }, []);

  const fetchReviews = async (productId, page = 1, limit = 10) => {
    setLoading(true);
    setError('');
    try {
      const reviewData = await getReviews(productId, page, limit);
      setReviews(reviewData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addReview = async (productId, rating, comment) => {
    setLoading(true);
    setError('');
    try {
      const review = await createReview(productId, rating, comment);
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