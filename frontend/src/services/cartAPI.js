import {
    addToCart,
    getCart,
    removeFromCart,
    clearCart,
    placeOrderFromCart,
  } from './api';
  
  export const cartService = {
    // Add or update an item in the cart
    addToCart: async (data) => {
      try {
        const response = await addToCart(data);
        return {
          success: true,
          data: response.data.cart,
          message: response.data.message || 'Item added to cart successfully',
        };
      } catch (error) {
        return {
          success: false,
          data: null,
          message: error.response?.data?.message || 'Failed to add item to cart',
        };
      }
    },
  
    // Get the user's cart
    getCart: async () => {
      try {
        const response = await getCart();
        return {
          success: true,
          data: response.data.cart,
          message: response.data.message || 'Cart retrieved successfully',
        };
      } catch (error) {
        return {
          success: false,
          data: null,
          message: error.response?.data?.message || 'Failed to fetch cart',
        };
      }
    },
  
    // Remove an item from the cart
    removeFromCart: async (productId) => {
      try {
        const response = await removeFromCart(productId);
        return {
          success: true,
          data: response.data.cart,
          message: response.data.message || 'Item removed from cart successfully',
        };
      } catch (error) {
        return {
          success: false,
          data: null,
          message: error.response?.data?.message || 'Failed to remove item from cart',
        };
      }
    },
  
    // Clear the cart
    clearCart: async () => {
      try {
        const response = await clearCart();
        return {
          success: true,
          data: response.data.cart,
          message: response.data.message || 'Cart cleared successfully',
        };
      } catch (error) {
        return {
          success: false,
          data: null,
          message: error.response?.data?.message || 'Failed to clear cart',
        };
      }
    },
  
    // Place an order from the cart
    placeOrderFromCart: async (data) => {
      try {
        const response = await placeOrderFromCart(data);
        return {
          success: true,
          data: response.data.order,
          message: response.data.message || 'Order placed successfully',
        };
      } catch (error) {
        return {
          success: false,
          data: null,
          message: error.response?.data?.message || 'Failed to place order',
        };
      }
    },
  };