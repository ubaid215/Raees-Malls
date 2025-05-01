import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import * as cartService from '../services/cartService';
import { toast } from 'react-toastify';

const CartContext = createContext();
CartContext.displayName = 'CartContext';

const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
  
    setLoading(true);
    setError(null);
    try {
      const result = await cartService.getCart();
      // console.log('fetchCart: Result:', result);
      if (result.success) {
        const cartData = result.cart || { items: [], totalPrice: 0, itemCount: 0 };
        setCart(cartData);
        // console.log('fetchCart: Updated cart state:', cartData);
        if (cartData.items.some(item => item.isUnavailable || item.isVariantUnavailable)) {
          toast.warn('Some items in your cart are unavailable');
        }
      } else {
        setError({
          message: result.message,
          status: result.status
        });
        setCart(null);
      }
    } catch (err) {
      console.error('fetchCart: Error:', {
        message: err.message,
        status: err.response?.status,
        details: err.response?.data
      });
      setError({
        message: err.message || 'Failed to fetch cart',
        status: err.response?.status
      });
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // useEffect(() => {
  //   console.log('CartContext: Cart state changed:', cart);
  // }, [cart]);

  const addItemToCart = useCallback(async (productId, variantId = null, quantity = 1) => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return { success: false, message: 'Please login to add items to cart' };
    }

    setLoading(true);
    try {
      const result = await cartService.addToCart(productId, variantId, quantity);
      if (result.success) {
        await fetchCart();
        toast.success(result.message);
        return { success: true, cart: result.cart };
      }
      throw new Error(result.message);
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error(error.message || 'Failed to add to cart');
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [user, navigate, fetchCart]);

  const updateQuantity = useCallback(async (productId, quantity, variantId = null) => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return { success: false, message: 'Please login to update cart' };
    }

    setLoading(true);
    try {
      const result = await cartService.updateQuantity(productId, quantity, variantId);
      if (result.success) {
        await fetchCart();
        toast.success(result.message);
        return { success: true, cart: result.cart };
      }
      throw new Error(result.message);
    } catch (error) {
      console.error('Update quantity error:', error);
      toast.error(error.message || 'Failed to update quantity');
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [user, navigate, fetchCart]);

  const removeFromCart = useCallback(async (productId, variantId = null) => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return { success: false, message: 'Please login to remove items from cart' };
    }

    setLoading(true);
    try {
      const result = await cartService.removeFromCart(productId, variantId);
      if (result.success) {
        await fetchCart();
        toast.success(result.message);
        return { success: true, cart: result.cart };
      }
      throw new Error(result.message);
    } catch (error) {
      console.error('Remove from cart error:', error);
      toast.error(error.message || 'Failed to remove from cart');
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [user, navigate, fetchCart]);

  const clearCart = useCallback(async () => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return { success: false, message: 'Please login to clear cart' };
    }

    setLoading(true);
    try {
      const result = await cartService.clearCart();
      if (result.success) {
        await fetchCart();
        toast.success(result.message);
        return { success: true, cart: result.cart };
      }
      throw new Error(result.message);
    } catch (error) {
      console.error('Clear cart error:', error);
      toast.error(error.message || 'Failed to clear cart');
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [user, navigate, fetchCart]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const contextValue = useMemo(() => ({
    cartItems: cart?.items || [],
    isLoading: loading,
    error,
    totalPrice: cart?.totalPrice || 0,
    itemCount: cart?.itemCount || 0,
    addItemToCart,
    fetchCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  }), [cart, loading, error, addItemToCart, fetchCart, updateQuantity, removeFromCart, clearCart]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export { CartProvider, useCart };