import api from './api';

// Create review (user)
export const createReview = async (productId, rating, comment) => {
  try {
    const response = await api.post('/reviews', { productId, rating, comment });
    return response.data.review;
  } catch (error) {
    throw new Error(error.message || 'Failed to create review');
  }
};

// Get reviews for a product (public)
export const getReviews = async (productId, page = 1, limit = 10) => {
  try {
    const response = await api.get(`/reviews/${productId}`, { params: { page, limit } });
    return response.data.reviews;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch reviews');
  }
};