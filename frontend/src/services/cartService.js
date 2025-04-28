import api from './api';

// Add to cart
export const addToCart = async (productId, variantId = null, quantity = 1) => {
  try {
    const response = await api.post('/cart', { productId, variantId, quantity });
    return response.data.cart;
  } catch (error) {
    throw new Error(error.message || 'Failed to add to cart');
  }
};

// Get cart
export const getCart = async () => {
  try {
    const response = await api.get('/cart');
    return response.data.cart;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch cart');
  }
};

// Update cart item
export const updateCartItem = async (productId, variantId = null, quantity) => {
  try {
    const response = await api.put('/cart', { productId, variantId, quantity });
    return response.data.cart;
  } catch (error) {
    throw new Error(error.message || 'Failed to update cart');
  }
};

// Remove from cart
export const removeFromCart = async (productId, variantId = null) => {
  try {
    const url = variantId ? `/cart/${productId}/${variantId}` : `/cart/${productId}`;
    const response = await api.delete(url);
    return response.data.cart;
  } catch (error) {
    throw new Error(error.message || 'Failed to remove from cart');
  }
};