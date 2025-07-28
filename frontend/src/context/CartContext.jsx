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

  // Refs for operation tracking and mount status
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const isUpdatingRef = useRef(false);
  const pendingOperationsRef = useRef(new Set());
  const lastCartUpdateRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearCartCache = useCallback(() => {
    if (user?._id) {
      const cacheKey = `cart_user_${user._id}`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`${cacheKey}_timestamp`);
    }
  }, [user]);

  const fetchCartInternal = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current || !user?._id) {
      if (!user?._id && isMountedRef.current) {
        setCart(null);
      }
      return { success: false, message: 'User not authenticated' };
    }

    if (isFetchingRef.current && !forceRefresh) {
      return { success: false, message: 'Already fetching' };
    }

    // Cache handling
    const cacheKey = `cart_user_${user._id}`;
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const cacheValid = cacheTimestamp && Date.now() - parseInt(cacheTimestamp) < 5 * 60 * 1000; // 5 minutes

    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached && cacheValid) {
        if (isMountedRef.current) {
          setCart(JSON.parse(cached));
        }
        return { success: true, cart: JSON.parse(cached) };
      }
    }

    isFetchingRef.current = true;
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await cartService.getCart();
      
      if (result.success) {
        const cartData = result.cart || { 
          items: [], 
          totalPrice: 0, 
          totalShippingCost: 0,
          itemCount: 0 
        };

        const updatedCartData = {
          ...cartData,
          items: cartData.items.map(item => ({
            ...item,
            shippingCost: item.productId?.shippingCost || item.shippingCost || 0,
            variantDisplay: {
              color: item.variantColor || item.variantInfo?.color,
              storage: item.storageCapacity || item.variantInfo?.storage,
              size: item.size || item.variantInfo?.size
            }
          })),
        };

        if (isMountedRef.current) {
          setCart(updatedCartData);
          lastCartUpdateRef.current = Date.now();
        }

        // Cache response
        localStorage.setItem(cacheKey, JSON.stringify(updatedCartData));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());

        if (updatedCartData.items.some(item => item.isUnavailable || item.isVariantUnavailable)) {
          toast.warn('Some items in your cart are unavailable');
        }

        return { success: true, cart: updatedCartData };
      }

      if (isMountedRef.current) {
        setError({
          message: result.message,
          status: result.status
        });
        setCart(null);
      }
      return { success: false, message: result.message };
    } catch (err) {
      if (isMountedRef.current) {
        setError({
          message: err.message || 'Failed to fetch cart',
          status: err.response?.status
        });
        setCart(null);
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [user]);

  // Stable debounced fetch function
  const debouncedFetchCart = useMemo(() => 
    debounce(async (forceRefresh = false) => {
      return fetchCartInternal(forceRefresh);
    }, 500),
  [fetchCartInternal]);

  const performCartOperation = useCallback(async (operationName, operation, ...args) => {
    if (!isMountedRef.current) return { success: false, message: 'Component unmounted' };
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return { success: false, message: 'Please login to perform this action' };
    }

    const operationKey = `${operationName}-${JSON.stringify(args)}`;
    if (pendingOperationsRef.current.has(operationKey)) {
      return { success: false, message: 'Operation already in progress' };
    }

    pendingOperationsRef.current.add(operationKey);
    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      const result = await operation(...args);
      
      if (result.success) {
        clearCartCache();
        
        // Debounce the fetch but ensure it happens after the operation
        setTimeout(() => {
          if (isMountedRef.current) {
            debouncedFetchCart(true).catch(console.error);
          }
        }, 100);

        if (isMountedRef.current) {
          toast.success(result.message);
        }
        return { success: true, cart: result.cart };
      }
      
      throw new Error(result.message);
    } catch (error) {
      if (isMountedRef.current) {
        toast.error(error.message || `Failed to ${operationName.toLowerCase()}`);
      }
      return { success: false, message: error.message };
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      pendingOperationsRef.current.delete(operationKey);
    }
  }, [user, navigate, debouncedFetchCart, clearCartCache]);

  // Memoized cart operations with debouncing
  const cartOperations = useMemo(() => {
    const createOperation = (name, serviceFn) => {
      return (...args) => {
        return new Promise((resolve, reject) => {
          const debouncedFn = debounce(async () => {
            try {
              const result = await performCartOperation(name, serviceFn, ...args);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }, 300);
          
          debouncedFn();
        });
      };
    };

    return {
      addItemToCart: createOperation('addToCart', cartService.addToCart),
      updateQuantity: createOperation('updateQuantity', cartService.updateQuantity),
      removeFromCart: createOperation('removeFromCart', cartService.removeFromCart),
      clearCart: createOperation('clearCart', cartService.clearCart),
    };
  }, [performCartOperation]);

  const placeOrderFromCart = useCallback(async (shippingAddress) => {
    if (!isMountedRef.current) return { success: false, message: 'Component unmounted' };
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return { success: false, message: 'Please login to place order' };
    }

    if (isUpdatingRef.current) {
      return { success: false, message: 'Order placement already in progress' };
    }

    isUpdatingRef.current = true;
    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      const result = await cartService.placeOrderFromCart(shippingAddress);
      
      if (result.success) {
        clearCartCache();
        
        setTimeout(() => {
          if (isMountedRef.current) {
            debouncedFetchCart(true).catch(console.error);
          }
        }, 100);
        
        if (isMountedRef.current) {
          toast.success('Order placed successfully');
        }
        return { success: true, order: result.order };
      }
      
      throw new Error(result.message);
    } catch (error) {
      if (isMountedRef.current) {
        toast.error(error.message || 'Failed to place order');
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isUpdatingRef.current = false;
    }
  }, [user, navigate, debouncedFetchCart, clearCartCache]);

  // Initialize cart on user change
  useEffect(() => {
    if (!isMountedRef.current) return;

    const fetchCart = async () => {
      try {
        await debouncedFetchCart();
      } catch (err) {
        if (isMountedRef.current) {
          toast.error('Failed to load cart: ' + (err.message || 'Unknown error'));
        }
      }
    };

    if (user) {
      // Only fetch if we don't have recent cart data
      if (!lastCartUpdateRef.current || Date.now() - lastCartUpdateRef.current > 10000) {
        fetchCart();
      }
    } else {
      setCart(null);
      setError(null);
    }
  }, [user, debouncedFetchCart]);

  const contextValue = useMemo(() => ({
    cartItems: cart?.items || [],
    isLoading: loading,
    error,
    totalPrice: cart?.totalPrice || 0,
    totalShippingCost: cart?.totalShippingCost || 0,
    itemCount: cart?.itemCount || 0,
    
    // Cart operations
    ...cartOperations,
    placeOrderFromCart,
    createVariantOptions: cartService.createVariantOptions,
    
    // Helper functions
    fetchCart: debouncedFetchCart,
    getItemUniqueKey: (item) => `${item.productId}_${item.variantColor || ''}_${item.storageCapacity || ''}_${item.size || ''}`,
    findCartItem: (productId, variantOptions = {}) => {
      const items = cart?.items || [];
      return items.find(item => 
        item.productId === productId &&
        item.variantColor === variantOptions.variantColor &&
        item.storageCapacity === variantOptions.storageCapacity &&
        item.size === variantOptions.size
      );
    },
    isFreeShipping: (cart?.totalPrice >= 2500 || cart?.itemCount >= 2500),
  }), [cart, loading, error, cartOperations, placeOrderFromCart, debouncedFetchCart]);

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