import api from './api';

export const addToCart = async (productId, variantOptions = {}, quantity = 1) => {
  try {
    const body = { 
      productId: typeof productId === 'object' ? productId._id.toString() : productId.toString(), 
      quantity 
    };
    
    // Handle variant options based on backend structure
    if (variantOptions.variantColor) {
      body.variantColor = variantOptions.variantColor;
    }
    if (variantOptions.storageCapacity) {
      body.storageCapacity = variantOptions.storageCapacity;
    }
    if (variantOptions.size) {
      body.size = variantOptions.size;
    }
    
    // console.log('addToCart request body:', body);
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
    // console.log('cartService.getCart: Full Response:', response);
    // console.log('cartService.getCart: Response Data:', response.data);
    
    if (!response.data.data.cart) {
      console.warn('cartService.getCart: response.data.data.cart is null');
      return {
        success: true,
        cart: { 
          items: [], 
          totalPrice: 0, 
          totalShippingCost: 0,
          itemCount: 0 
        }
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

export const updateQuantity = async (productId, quantity, variantOptions = {}) => {
  try {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Quantity must be an integer greater than or equal to 1');
    }
    
    const body = { 
      productId: typeof productId === 'object' ? productId._id.toString() : productId.toString(), 
      quantity 
    };
    
    // Handle variant options based on backend structure
    if (variantOptions.variantColor) {
      body.variantColor = variantOptions.variantColor;
    }
    if (variantOptions.storageCapacity) {
      body.storageCapacity = variantOptions.storageCapacity;
    }
    if (variantOptions.size) {
      body.size = variantOptions.size;
    }
    
    // console.log('updateQuantity request body:', body);
    const response = await api.put('/cart', body);
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

export const removeFromCart = async (productId, variantOptions = {}) => {
  try {
    const body = {
      productId: typeof productId === 'object' ? productId._id.toString() : productId.toString()
    };
    
    // Handle variant options based on backend structure
    if (variantOptions.variantColor) {
      body.variantColor = variantOptions.variantColor;
    }
    if (variantOptions.storageCapacity) {
      body.storageCapacity = variantOptions.storageCapacity;
    }
    if (variantOptions.size) {
      body.size = variantOptions.size;
    }
    
    // console.log('removeFromCart request body:', body);
    const response = await api.delete('/cart/item', { data: body });
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
    const response = await api.delete('/cart/clear');
    return {
      success: response.data.success,
      cart: response.data.data.cart || { 
        items: [], 
        totalPrice: 0, 
        totalShippingCost: 0,
        itemCount: 0 
      },
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

export const placeOrderFromCart = async (shippingAddress) => {
  try {
    const body = {
      shippingAddress
    };
    
    // console.log('placeOrderFromCart request body:', body);
    const response = await api.post('/cart/order', body);
    return {
      success: response.data.success,
      order: response.data.data.order,
      message: response.data.message
    };
  } catch (error) {
    console.error('placeOrderFromCart API Error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.errors
      ? error.response.data.errors.map(e => e.msg).join('; ')
      : error.response?.data?.message || 'Failed to place order';
    return {
      success: false,
      message: errorMessage
    };
  }
};

// Helper function to create variant options object
export const createVariantOptions = (variantColor = null, storageCapacity = null, size = null) => {
  const options = {};
  if (variantColor) options.variantColor = variantColor;
  if (storageCapacity) options.storageCapacity = storageCapacity;
  if (size) options.size = size;
  return options;
};

// Backward compatibility function for old variantId approach
export const addToCartLegacy = async (productId, variantId = null, quantity = 1) => {
  console.warn('addToCartLegacy is deprecated. Use addToCart with variantOptions instead.');
  return addToCart(productId, variantId ? { variantId } : {}, quantity);
};