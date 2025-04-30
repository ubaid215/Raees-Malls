import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo
} from 'react';
import {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart
} from '../services/cartService';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

// Create context
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
      const cartData = await getCart();
      setCart(cartData);
    } catch (err) {
      setError({
        message: err.message || 'Failed to fetch cart',
        status: err.response?.status
      });
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addItemToCart = useCallback(async (productId, variantId = null, quantity = 1) => {
    if (!user) {
      navigate('/login', {
        state: {
          from: window.location.pathname,
          message: 'Please login to add items to your cart'
        }
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await addToCart(productId, variantId, quantity);
      await fetchCart();
    } catch (err) {
      setError({
        message: err.message || 'Failed to add item to cart',
        status: err.response?.status
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCart, user, navigate]);

  const removeItem = useCallback(async (productId) => {
    if (!user) {
      navigate('/login', {
        state: {
          from: window.location.pathname,
          message: 'Please login to remove items from your cart'
        }
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await removeFromCart(productId);
      await fetchCart();
    } catch (err) {
      setError({
        message: err.message || 'Failed to remove item',
        status: err.response?.status
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCart, user, navigate]);

  const updateQuantity = useCallback(async (productId, quantity) => {
    if (!user) {
      navigate('/login', {
        state: {
          from: window.location.pathname,
          message: 'Please login to update your cart'
        }
      });
      return;
    }

    if (quantity <= 0) {
      return removeItem(productId); // ✅ Now removeItem is defined above
    }

    setLoading(true);
    setError(null);
    try {
      await updateCartItem(productId, null, quantity);
      await fetchCart();
    } catch (err) {
      setError({
        message: err.message || 'Failed to update quantity',
        status: err.response?.status
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCart, user, navigate, removeItem]);

  const clearCart = useCallback(async () => {
    if (!user) {
      navigate('/login', {
        state: {
          from: window.location.pathname,
          message: 'Please login to access your cart'
        }
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (cart?.items?.length > 0) {
        await Promise.all(
          cart.items.map(item =>
            removeFromCart(item.productId, item.variantId)
          )
        );
      }
      await fetchCart();
    } catch (err) {
      setError({
        message: err.message || 'Failed to clear cart',
        status: err.response?.status
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cart?.items, fetchCart, user, navigate]);

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
    removeItem,
    clearCart,
  }), [
    cart,
    loading,
    error,
    addItemToCart,
    fetchCart,
    updateQuantity,
    removeItem,
    clearCart
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
