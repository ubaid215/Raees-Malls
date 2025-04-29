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
import { useAdminAuth } from './AdminAuthContext';

// Create context with display name for better debugging
const CartContext = createContext();
CartContext.displayName = 'CartContext';

const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAdminAuth();

  // Fetch cart data
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

  // Add item to cart
  const addItemToCart = useCallback(async (productId, variantId = null, quantity = 1) => {
    if (!user) {
      throw new Error('Please login to add items to cart');
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
  }, [fetchCart, user]);

  // Update item quantity
  const updateQuantity = useCallback(async (productId, quantity) => {
    if (quantity <= 0) {
      return removeItem(productId);
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
  }, [fetchCart]);

  // Remove item from cart
  const removeItem = useCallback(async (productId) => {
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
  }, [fetchCart]);

  // Clear entire cart
  const clearCart = useCallback(async () => {
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
  }, [cart?.items, fetchCart]);

  // Fetch cart on user change
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Memoized context value to prevent unnecessary re-renders
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

// Custom hook for consuming context
const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Named exports for better HMR compatibility
export { CartProvider, useCart };