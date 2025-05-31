import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
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

  const clearCartCache = useCallback(() => {
    if (user) {
      const cacheKey = `cart_user_${user._id}`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`${cacheKey}_timestamp`);
      console.log('Cart cache cleared for user:', user._id);
    }
  }, [user]);

  const fetchCartInternal = useCallback(async () => {
    if (!user) {
      setCart(null);
      return { success: false, message: 'User not authenticated' };
    }

    // Check cache
    const cacheKey = `cart_user_${user._id}`;
    const cached = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 5 * 60 * 1000; // 5 minutes

    if (cached && cacheValid) {
      console.log('fetchCart: Using cached cart');
      setCart(JSON.parse(cached));
      return { success: true, cart: JSON.parse(cached) };
    }

    setLoading(true);
    setError(null);
    try {
      const result = await cartService.getCart();
      console.log('fetchCart: Result:', result);
      if (result.success) {
        const cartData = result.cart || { items: [], totalPrice: 0, itemCount: 0 };
        const updatedCartData = {
          ...cartData,
          items: cartData.items.map(item => ({
            ...item,
            shippingCost: item.productId?.shippingCost || 0,
          })),
        };
        setCart(updatedCartData);
        console.log('fetchCart: Updated cart state:', updatedCartData);
        // Cache response
        localStorage.setItem(cacheKey, JSON.stringify(updatedCartData));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
        if (updatedCartData.items.some(item => item.isUnavailable || item.isVariantUnavailable)) {
          toast.warn('Some items in your cart are unavailable');
        }
        return { success: true, cart: updatedCartData };
      } else {
        setError({
          message: result.message,
          status: result.status
        });
        setCart(null);
        return { success: false, message: result.message };
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
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const debouncedFetchCart = useCallback(() => {
    return new Promise((resolve, reject) => {
      const debounced = debounce(async () => {
        try {
          const result = await fetchCartInternal();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      }, 1000);
      debounced();
    });
  }, [fetchCartInternal]);

  const addItemToCart = useCallback(async (productId, variantId = null, quantity = 1) => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return { success: false, message: 'Please login to add items to cart' };
    }

    setLoading(true);
    try {
      const result = await cartService.addToCart(productId, variantId, quantity);
      if (result.success) {
        clearCartCache(); // Invalidate cache
        await debouncedFetchCart();
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
  }, [user, navigate, debouncedFetchCart, clearCartCache]);

  const updateQuantity = useCallback(async (productId, quantity, variantId = null) => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return { success: false, message: 'Please login to update cart' };
    }

    setLoading(true);
    try {
      const result = await cartService.updateQuantity(productId, quantity, variantId);
      if (result.success) {
        clearCartCache(); // Invalidate cache
        await debouncedFetchCart();
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
  }, [user, navigate, debouncedFetchCart, clearCartCache]);

  const removeFromCart = useCallback(async (productId, variantId = null) => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return { success: false, message: 'Please login to remove items from cart' };
    }

    setLoading(true);
    try {
      const result = await cartService.removeFromCart(productId, variantId);
      if (result.success) {
        clearCartCache(); // Invalidate cache
        await debouncedFetchCart();
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
  }, [user, navigate, debouncedFetchCart, clearCartCache]);

  const clearCart = useCallback(async () => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return { success: false, message: 'Please login to clear cart' };
    }

    setLoading(true);
    try {
      const result = await cartService.clearCart();
      if (result.success) {
        clearCartCache(); // Invalidate cache
        await debouncedFetchCart();
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
  }, [user, navigate, debouncedFetchCart, clearCartCache]);

  const placeOrder = useCallback(async (orderData) => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return { success: false, message: 'Please login to place order' };
    }

    setLoading(true);
    try {
      const result = await cartService.placeOrder(orderData);
      if (result.success) {
        clearCartCache(); // Invalidate cache
        await debouncedFetchCart();
        toast.success('Order placed successfully');
        return { success: true, order: result.order };
      }
      throw new Error(result.message);
    } catch (error) {
      console.error('Place order error:', error);
      toast.error(error.message || 'Failed to place order');
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [user, navigate, debouncedFetchCart, clearCartCache]);

  useEffect(() => {
    if (user) {
      debouncedFetchCart().catch(err => {
        console.error('Initial fetchCart error:', err);
        toast.error('Failed to load cart: ' + (err.message || 'Unknown error'));
      });
    }
    return () => {
      // No cleanup needed; debounce handled by Promise
    };
  }, [user, debouncedFetchCart]);

  const contextValue = useMemo(() => ({
    cartItems: cart?.items || [],
    isLoading: loading,
    error,
    totalPrice: cart?.totalPrice || 0,
    itemCount: cart?.itemCount || 0,
    addItemToCart,
    fetchCart: debouncedFetchCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    placeOrder,
  }), [cart, loading, error, addItemToCart, debouncedFetchCart, updateQuantity, removeFromCart, clearCart, placeOrder]);

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