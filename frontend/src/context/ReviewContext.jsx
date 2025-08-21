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

// Helper function to calculate new average rating
const calculateNewAverage = (currentAverage, currentCount, newRating) => {
  if (currentCount === 0) return newRating;
  return ((currentAverage * currentCount) + newRating) / (currentCount + 1);
};

export const ReviewContext = createContext();

export const ReviewProvider = ({ children }) => {
  const [reviews, setReviews] = useState([]);
  const [reviewData, setReviewData] = useState(null);
  const [reviewsByProduct, setReviewsByProduct] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  // Debounced fetchReviews - now returns the full response
const fetchReviews = useCallback(debounce(async (productId, page = 1, limit = 10, sort = 'recent', filter = 'all') => {
  setLoading(true);
  setError('');
  try {
    // console.log('Fetching reviews for productId:', productId);
    const response = await getReviews(productId, page, limit, sort, filter);
    // console.log('Review service response:', response);
    
    // Handle different response structures
    let reviewsData = response;
    
    // If response has a data property (wrapped response), use that
    if (response.data && typeof response.data === 'object') {
      reviewsData = response.data;
    }
    
    // Extract reviews and metadata
    const reviews = reviewsData.reviews || reviewsData || [];
    const averageRating = reviewsData.averageRating || 
                         (reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0);
    const totalReviews = reviewsData.totalReviews || reviewsData.count || reviews.length;
    
    // Create the complete review data object
    const completeReviewData = {
      reviews,
      averageRating,
      totalReviews,
      page: reviewsData.page || page,
      limit: reviewsData.limit || limit,
      totalPages: reviewsData.totalPages || Math.ceil(totalReviews / limit)
    };
    
    // Store reviews by product ID
    setReviewsByProduct(prev => ({
      ...prev,
      [productId]: completeReviewData
    }));
    
    // Also set the current reviews and reviewData for backward compatibility
    setReviews(reviews);
    setReviewData(completeReviewData);
    
    return completeReviewData;
  } catch (err) {
    console.error('Error in fetchReviews:', err);
    const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch reviews';
    setError(errorMessage);
    toast.error(errorMessage);
    throw err;
  } finally {
    setLoading(false);
  }
}, 300), [toast]);

  // Function to get reviews for a specific product
  const getReviewsForProduct = useCallback((productId) => {
    return reviewsByProduct[productId] || {};
  }, [reviewsByProduct]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const adminToken = localStorage.getItem('adminToken');

    if (userId) {
      socketService.connect(userId, adminToken ? 'admin' : 'user');
      socketService.on('reviewAdded', ({ productId, review }) => {
        // Update the specific product's reviews in real-time
        setReviewsByProduct(prev => {
          const currentData = prev[productId] || {};
          return {
            ...prev,
            [productId]: {
              ...currentData,
              reviews: [review, ...(currentData.reviews || [])],
              totalReviews: (currentData.totalReviews || 0) + 1,
              averageRating: calculateNewAverage(
                currentData.averageRating, 
                currentData.totalReviews, 
                review.rating
              )
            }
          };
        });
        
        // Also update the current reviews if they match the product
        if (reviewData?.productId === productId) {
          setReviews(prev => [review, ...prev]);
          setReviewData(prev => ({
            ...prev,
            reviews: [review, ...(prev.reviews || [])],
            totalReviews: (prev.totalReviews || 0) + 1,
            averageRating: calculateNewAverage(
              prev.averageRating, 
              prev.totalReviews, 
              review.rating
            )
          }));
        }
        
        toast.success('New review added!');
      });
      
      socketService.on('reviewUpdated', ({ productId, review }) => {
        // Update the specific product's reviews in real-time
        setReviewsByProduct(prev => {
          const currentData = prev[productId] || {};
          const updatedReviews = (currentData.reviews || []).map(r => 
            r._id === review._id ? review : r
          );
          
          // Recalculate average rating
          const totalRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
          const averageRating = updatedReviews.length > 0 ? totalRating / updatedReviews.length : 0;
          
          return {
            ...prev,
            [productId]: {
              ...currentData,
              reviews: updatedReviews,
              averageRating
            }
          };
        });
        
        // Also update the current reviews if they match the product
        if (reviewData?.productId === productId) {
          setReviews(prev => prev.map(r => r._id === review._id ? review : r));
          setReviewData(prev => {
            const updatedReviews = (prev.reviews || []).map(r => 
              r._id === review._id ? review : r
            );
            
            // Recalculate average rating
            const totalRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
            const averageRating = updatedReviews.length > 0 ? totalRating / updatedReviews.length : 0;
            
            return {
              ...prev,
              reviews: updatedReviews,
              averageRating
            };
          });
        }
      });
      
      socketService.on('reviewDeleted', ({ productId, reviewId }) => {
        // Update the specific product's reviews in real-time
        setReviewsByProduct(prev => {
          const currentData = prev[productId] || {};
          const updatedReviews = (currentData.reviews || []).filter(r => r._id !== reviewId);
          
          // Recalculate average rating
          const totalRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
          const averageRating = updatedReviews.length > 0 ? totalRating / updatedReviews.length : 0;
          
          return {
            ...prev,
            [productId]: {
              ...currentData,
              reviews: updatedReviews,
              totalReviews: (currentData.totalReviews || 1) - 1,
              averageRating
            }
          };
        });
        
        // Also update the current reviews if they match the product
        if (reviewData?.productId === productId) {
          setReviews(prev => prev.filter(r => r._id !== reviewId));
          setReviewData(prev => {
            const updatedReviews = (prev.reviews || []).filter(r => r._id !== reviewId);
            
            // Recalculate average rating
            const totalRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
            const averageRating = updatedReviews.length > 0 ? totalRating / updatedReviews.length : 0;
            
            return {
              ...prev,
              reviews: updatedReviews,
              totalReviews: (prev.totalReviews || 1) - 1,
              averageRating
            };
          });
        }
      });
    }

    return () => {
      socketService.off('reviewAdded');
      socketService.off('reviewUpdated');
      socketService.off('reviewDeleted');
    };
  }, [reviewData, toast]);

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
    reviewData,
    reviewsByProduct,
    loading,
    error,
    fetchReviews,
    getReviewsForProduct,
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