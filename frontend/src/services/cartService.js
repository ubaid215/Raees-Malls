import api from './api';

export const addToCart = async (productId, variantId = null, quantity = 1) => {
  try {
    const body = { 
      productId: typeof productId === 'object' ? productId._id.toString() : productId.toString(), 
      quantity 
    };
    if (variantId) {
      body.variantId = typeof variantId === 'object' ? variantId._id.toString() : variantId.toString();
    }
    
    console.log('addToCart request body:', body); // Debug log
    const response = await api.post('/cart', body);
    return {
      success: response.data.success,
      cart: response.data.data.cart,
      message: response.data.message
    };
  } catch (error) {
    console.error('addToCart API Error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.errors
      ? error.response.data.errors.map(e => e.msg).join('; ')
      : error.response?.data?.message || 'Failed to add to cart';
    return {
      success: false,
      message: errorMessage
    };
  }
};

export const getCart = async () => {
  try {
    const response = await api.get('/cart');
    console.log('cartService.getCart: Full Response:', response);
    console.log('cartService.getCart: Response Data:', response.data);
    if (!response.data.data.cart) {
      console.warn('cartService.getCart: response.data.data.cart is null');
      return {
        success: true,
        cart: { items: [], totalPrice: 0, itemCount: 0 }
      };
    }
    return {
      success: response.data.success,
      cart: response.data.data.cart
    };
  } catch (error) {
    console.error('cartService.getCart: Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch cart',
      status: error.response?.status
    };
  }
};

export const updateQuantity = async (productId, quantity, variantId = null) => {
  try {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Quantity must be an integer greater than or equal to 1');
    }
    const body = { 
      productId: typeof productId === 'object' ? productId._id.toString() : productId.toString(), 
      quantity 
    };
    if (variantId) {
      body.variantId = typeof variantId === 'object' ? variantId._id.toString() : variantId.toString();
    }
    
    console.log('updateQuantity request body:', body); // Debug log
    const response = await api.post('/cart', body);
    return {
      success: response.data.success,
      cart: response.data.data.cart,
      message: response.data.message
    };
  } catch (error) {
    console.error('updateQuantity API Error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.errors
      ? error.response.data.errors.map(e => e.msg).join('; ')
      : error.response?.data?.message || error.message || 'Failed to update quantity';
    return {
      success: false,
      message: errorMessage
    };
  }
};

export const removeFromCart = async (productId, variantId = null) => {
  try {
    const productIdString = typeof productId === 'object' ? productId._id.toString() : productId.toString();
    const url = variantId 
      ? `/cart/${productIdString}/${typeof variantId === 'object' ? variantId._id.toString() : variantId.toString()}` 
      : `/cart/${productIdString}`;
    console.log('removeFromCart URL:', url); // Debug log
    const response = await api.delete(url);
    return {
      success: response.data.success,
      cart: response.data.data.cart,
      message: response.data.message
    };
  } catch (error) {
    console.error('removeFromCart API Error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.errors
      ? error.response.data.errors.map(e => e.msg).join('; ')
      : error.response?.data?.message || 'Failed to remove from cart';
    return {
      success: false,
      message: errorMessage
    };
  }
};

export const clearCart = async () => {
  try {
    const response = await api.delete('/cart');
    return {
      success: response.data.success,
      cart: response.data.data.cart || { items: [], totalPrice: 0, itemCount: 0 },
      message: response.data.message
    };
  } catch (error) {
    console.error('clearCart API Error:', error.response?.data);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to clear cart'
    };
  }
};