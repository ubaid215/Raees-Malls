import React, { createContext, useState, useEffect, useContext } from 'react';
import { addToCart, getCart, updateCartItem, removeFromCart } from '../services/cartService';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch cart on mount if user is logged in
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetchCart();
    }
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    setError('');
    try {
      const cartData = await getCart();
      setCart(cartData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItemToCart = async (productId, variantId = null, quantity = 1) => {
    setLoading(true);
    setError('');
    try {
      await addToCart(productId, variantId, quantity);
      await fetchCart();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCart = async (productId, variantId = null, quantity) => {
    setLoading(true);
    setError('');
    try {
      await updateCartItem(productId, variantId, quantity);
      await fetchCart();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeItemFromCart = async (productId, variantId = null) => {
    setLoading(true);
    setError('');
    try {
      await removeFromCart(productId, variantId);
      await fetchCart();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    cart,
    loading,
    error,
    addItemToCart,
    fetchCart,
    updateCart,
    removeItemFromCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// Custom hook to use CartContext
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};