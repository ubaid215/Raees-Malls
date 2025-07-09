import api from './api';

// Create review (user)
export const createReview = async (productId, orderId, rating, comment) => {
  try {
    const response = await api.post('/reviews', { productId, orderId, rating, comment });
    return response.data.review;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create review');
  }
};

// Get reviews for a product (public)
export const getReviews = async (productId, page = 1, limit = 10, sort = 'recent', filter = 'all') => {
  try {
    const response = await api.get(`/reviews/${productId}`, { 
      params: { page, limit, sort, filter } 
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch reviews');
  }
};

// Update review (user)
export const updateReview = async (reviewId, rating, comment) => {
  try {
    const response = await api.put(`/reviews/${reviewId}`, { rating, comment });
    return response.data.review;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update review');
  }
};

// Delete review (user)
export const deleteReview = async (reviewId) => {
  try {
    await api.delete(`/reviews/${reviewId}`);
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete review');
  }
};

// Get user's reviews (user)
export const getUserReviews = async (userId, page = 1, limit = 10) => {
  try {
    const response = await api.get(`/reviews/user/${userId}`, { 
      params: { page, limit } 
    });
    return response.data.reviews;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch user reviews');
  }
};

// Vote on review helpfulness (user)
export const voteReview = async (reviewId, isHelpful) => {
  try {
    const response = await api.post(`/reviews/${reviewId}/${isHelpful ? 'helpful' : 'unhelpful'}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to vote on review');
  }
};