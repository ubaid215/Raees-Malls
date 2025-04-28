import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCart } from '../services/cartService'; // Import individual functions

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
      const token = localStorage.getItem('token'); // Assuming token is stored in localStorage
      const response = await getCart(token);
      if (response.data && response.data.cart) {
        setCart(response.data.cart);
        const totalItems = response.data.cart.items.reduce((sum, item) => sum + item.quantity, 0);
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
      const token = localStorage.getItem('token');
      const response = await addToCart(productId, quantity, token);
      if (response.data && response.data.cart) {
        setCart(response.data.cart);
        const totalItems = response.data.cart.items.reduce((sum, item) => sum + item.quantity, 0);
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
      const token = localStorage.getItem('token');
      const response = await removeFromCart(productId, token);
      if (response.data && response.data.cart) {
        setCart(response.data.cart);
        const totalItems = response.data.cart.items.reduce((sum, item) => sum + item.quantity, 0);
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
      const token = localStorage.getItem('token');
      const response = await clearCart(token);
      if (response.data && response.data.cart) {
        setCart(response.data.cart);
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
      const token = localStorage.getItem('token');
      const response = await placeOrderFromCart(shippingAddress, token);
      if (response.data && response.data.order) {
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
    const token = localStorage.getItem('token');
    if (token) {
      fetchCart();
      fetchWishlist();
    }
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