import api from './api';

// Create review (user)
export const createReview = async (productId, orderId, rating, comment) => {
  try {
    const response = await api.post('/reviews', { productId, orderId, rating, comment });
    // Handle both wrapped and unwrapped responses
    return response.data?.data?.review || response.data?.review || response.data;
  } catch (error) {
    console.error('Create review error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to create review');
  }
};

// Get reviews for a product (public)
export const getReviews = async (productId, page = 1, limit = 10, sort = 'recent', filter = 'all') => {
  try {
    // console.log('Service: Getting reviews for product:', productId);
    // console.log('Service: Params:', { page, limit, sort, filter });
    
    const response = await api.get(`/reviews/${productId}`, { 
      params: { page, limit, sort, filter } 
    });
    
    // console.log('Service: Raw API response:', response.data);
    
    const data = response.data?.data || response.data;
    
    // console.log('Service: Processed data:', data);
    
    return data;
  } catch (error) {
    console.error('Get reviews error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to fetch reviews');
  }
};

// Update review (user)
export const updateReview = async (reviewId, rating, comment) => {
  try {
    const response = await api.put(`/reviews/${reviewId}`, { rating, comment });
    return response.data?.data?.review || response.data?.review || response.data;
  } catch (error) {
    console.error('Update review error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to update review');
  }
};

// Delete review (user)
export const deleteReview = async (reviewId) => {
  try {
    await api.delete(`/reviews/${reviewId}`);
    return true;
  } catch (error) {
    console.error('Delete review error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to delete review');
  }
};

// Get user's reviews (user)
export const getUserReviews = async (userId, page = 1, limit = 10) => {
  try {
    const response = await api.get(`/reviews/user/${userId}`, { 
      params: { page, limit } 
    });
    const data = response.data?.data || response.data;
    return data.reviews || data;
  } catch (error) {
    console.error('Get user reviews error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to fetch user reviews');
  }
};

// Vote on review helpfulness (user)
export const voteReview = async (reviewId, isHelpful) => {
  try {
    const response = await api.post(`/reviews/${reviewId}/${isHelpful ? 'helpful' : 'unhelpful'}`);
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Vote review error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || 'Failed to vote on review');
  }
};