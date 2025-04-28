import api from './api';

// Add to wishlist
export const addToWishlist = async (productId, variantId = null) => {
  try {
    const response = await api.post('/wishlist', { productId, variantId });
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to add to wishlist');
  }
};

// Get wishlist
export const getWishlist = async () => {
  try {
    const response = await api.get('/wishlist');
    return response.data.wishlist.items;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch wishlist');
  }
};

// Remove from wishlist
export const removeFromWishlist = async (productId, variantId = null) => {
  try {
    const url = variantId ? `/wishlist/${productId}/${variantId}` : `/wishlist/${productId}`;
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    throw new Error(error.message || 'Failed to remove from wishlist');
  }
};