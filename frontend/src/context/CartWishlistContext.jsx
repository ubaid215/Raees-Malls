// /src/context/CartWishlistContext.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartService } from '../services/cartAPI'; 

const CartWishlistContext = createContext();

export function CartWishlistProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0); // Placeholder
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cart
  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await cartService.getCart();
      if (response.success && response.data) {
        setCart(response.data);
        const totalItems = response.data.items.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(totalItems);
      } else {
        setCart(null);
        setCartCount(0);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch cart');
      setCart(null);
      setCartCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add item to cart
  const addToCart = async (productId, quantity) => {
    setLoading(true);
    setError(null);
    try {
      const response = await cartService.addToCart({ productId, quantity });
      if (response.success) {
        setCart(response.data);
        const totalItems = response.data.items.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(totalItems);
        return response;
      } else {
        throw new Error(response.message || 'Failed to add item to cart');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await cartService.removeFromCart(productId);
      if (response.success) {
        setCart(response.data);
        const totalItems = response.data.items.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(totalItems);
        return response;
      } else {
        throw new Error(response.message || 'Failed to remove item from cart');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clear cart
  const clearCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await cartService.clearCart();
      if (response.success) {
        setCart(response.data);
        setCartCount(0);
        return response;
      } else {
        throw new Error(response.message || 'Failed to clear cart');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Place order from cart
  const placeOrderFromCart = async (shippingAddress) => {
    setLoading(true);
    setError(null);
    try {
      const response = await cartService.placeOrderFromCart({ shippingAddress });
      if (response.success) {
        setCart(null);
        setCartCount(0);
        return response;
      } else {
        throw new Error(response.message || 'Failed to place order');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Placeholder for wishlist (implement when wishlist backend is available)
  const fetchWishlist = async () => {
    // Example: const response = await wishlistService.getWishlist();
    setWishlistCount(0); // Replace with actual logic
  };

  // Fetch cart and wishlist on mount
  useEffect(() => {
    fetchCart();
    fetchWishlist();
  }, [fetchCart]);

  return (
    <CartWishlistContext.Provider
      value={{
        cart,
        cartCount,
        wishlistCount,
        loading,
        error,
        fetchCart,
        addToCart,
        removeFromCart,
        clearCart,
        placeOrderFromCart,
      }}
    >
      {children}
    </CartWishlistContext.Provider>
  );
}

export function useCartWishlist() {
  const context = useContext(CartWishlistContext);
  if (!context) {
    throw new Error('useCartWishlist must be used within a CartWishlistProvider');
  }
  return context;
}