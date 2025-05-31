import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
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

  // Refs to prevent duplicate operations
  const isFetching = useRef(false);
  const isUpdating = useRef(false);
  const pendingOperations = useRef(new Set());

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

    if (isFetching.current) {
      console.log('fetchCart: Already fetching, skipping');
      return { success: false, message: 'Already fetching' };
    }

    // Check cache first
    const cacheKey = `cart_user_${user._id}`;
    const cached = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 5 * 60 * 1000; // 5 minutes

    if (cached && cacheValid) {
      console.log('fetchCart: Using cached cart');
      setCart(JSON.parse(cached));
      return { success: true, cart: JSON.parse(cached) };
    }

    isFetching.current = true;
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
      isFetching.current = false;
    }
  }, [user]);

  // Debounced fetch cart function that returns a Promise
  const debouncedFetchCart = useCallback(() => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        try {
          const result = await fetchCartInternal();
          resolve(result);
        } catch (err) {
          console.error('Debounced fetchCart error:', err);
          reject(err);
        }
      }, 500);
      
      debouncedFn();
    });
  }, [fetchCartInternal]);

  // Generic debounced cart operation handler
  const performCartOperation = useCallback(async (operationName, operation, ...args) => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return { success: false, message: 'Please login to perform this action' };
    }

    const operationKey = `${operationName}-${JSON.stringify(args)}`;
    
    if (pendingOperations.current.has(operationKey)) {
      console.log(`${operationName}: Operation already pending, skipping`);
      return { success: false, message: 'Operation already in progress' };
    }

    pendingOperations.current.add(operationKey);
    setLoading(true);
    
    try {
      const result = await operation(...args);
      
      if (result.success) {
        clearCartCache(); // Invalidate cache
        
        // Debounce the fetch to prevent rapid successive calls
        setTimeout(() => {
          debouncedFetchCart().catch(err => {
            console.error(`${operationName}: Failed to refresh cart`, err);
          });
        }, 100);
        
        toast.success(result.message);
        return { success: true, cart: result.cart };
      }
      
      throw new Error(result.message);
    } catch (error) {
      console.error(`${operationName} error:`, error);
      toast.error(error.message || `Failed to ${operationName.toLowerCase()}`);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
      pendingOperations.current.delete(operationKey);
    }
  }, [user, navigate, debouncedFetchCart, clearCartCache]);

  // Debounced cart operations that return Promises
  const addItemToCart = useCallback((productId, variantId = null, quantity = 1) => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        try {
          const result = await performCartOperation(
            'addToCart',
            cartService.addToCart,
            productId,
            variantId,
            quantity
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 300);
      
      debouncedFn();
    });
  }, [performCartOperation]);

  const updateQuantity = useCallback((productId, quantity, variantId = null) => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        try {
          const result = await performCartOperation(
            'updateQuantity',
            cartService.updateQuantity,
            productId,
            quantity,
            variantId
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 500);
      
      debouncedFn();
    });
  }, [performCartOperation]);

  const removeFromCart = useCallback((productId, variantId = null) => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        try {
          const result = await performCartOperation(
            'removeFromCart',
            cartService.removeFromCart,
            productId,
            variantId
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 300);
      
      debouncedFn();
    });
  }, [performCartOperation]);

  const clearCart = useCallback(() => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        try {
          const result = await performCartOperation(
            'clearCart',
            cartService.clearCart
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 300);
      
      debouncedFn();
    });
  }, [performCartOperation]);

  const placeOrder = useCallback((orderData) => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        if (!user) {
          navigate('/login', { state: { from: window.location.pathname } });
          resolve({ success: false, message: 'Please login to place order' });
          return;
        }

        if (isUpdating.current) {
          resolve({ success: false, message: 'Order placement already in progress' });
          return;
        }

        isUpdating.current = true;
        setLoading(true);
        
        try {
          const result = await cartService.placeOrder(orderData);
          
          if (result.success) {
            clearCartCache(); // Invalidate cache
            
            // Refresh cart after order placement
            setTimeout(() => {
              debouncedFetchCart().catch(err => {
                console.error('Failed to refresh cart after order placement', err);
              });
            }, 100);
            
            toast.success('Order placed successfully');
            resolve({ success: true, order: result.order });
          } else {
            throw new Error(result.message);
          }
        } catch (error) {
          console.error('Place order error:', error);
          toast.error(error.message || 'Failed to place order');
          reject(error);
        } finally {
          setLoading(false);
          isUpdating.current = false;
        }
      }, 1000);
      
      debouncedFn();
    });
  }, [user, navigate, debouncedFetchCart, clearCartCache]);

  // Effect to fetch cart when user changes
  useEffect(() => {
    if (user && !isFetching.current) {
      debouncedFetchCart().catch(err => {
        console.error('Initial fetchCart error:', err);
        toast.error('Failed to load cart: ' + (err.message || 'Unknown error'));
      });
    } else if (!user) {
      // Clear cart when user logs out
      setCart(null);
      setError(null);
    }

    // Cleanup function - no need to cancel since we're using Promise-wrapped debounced functions
    return () => {
      // Reset operation flags when component unmounts or user changes
      isFetching.current = false;
      isUpdating.current = false;
      pendingOperations.current.clear();
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
  }), [
    cart,
    loading,
    error,
    addItemToCart,
    debouncedFetchCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    placeOrder
  ]);

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