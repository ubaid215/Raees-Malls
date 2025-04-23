import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

export const CartWishlistContext = createContext();

export const useCartWishlist = () => {
  const context = useContext(CartWishlistContext);
  if (!context) {
    throw new Error('useCartWishlist must be used within a CartWishlistProvider');
  }
  return context;
};

export const CartWishlistProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState({ fetch: false, cart: false, wishlist: false, order: false });
  const [error, setError] = useState(null);

  // Fetch cart and wishlist
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    console.log('Fetching cart/wishlist, token:', token ? 'Present' : 'Missing');
    if (!token) {
      setCartItems([]);
      setWishlistItems([]);
      setLoading(prev => ({ ...prev, fetch: false }));
      setError('Please log in to view cart and wishlist');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, fetch: true }));
      const [cartResponse, wishlistResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/cart', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:5000/api/wishlist', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      console.log('Cart response:', cartResponse.data);
      console.log('Wishlist response:', wishlistResponse.data);
      setCartItems(cartResponse.data.items || []);
      setWishlistItems(wishlistResponse.data.items || []);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(prev => ({ ...prev, fetch: false }));
    }
  }, []);

  // Fetch data on mount and token change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addToCart = async (product, quantity = 1) => {
    const token = localStorage.getItem('token');
    const productId = product?._id || product?.productId;
    console.log('Adding to cart, token:', token ? 'Present' : 'Missing', 'productId:', productId, 'product:', product);

    if (!token) {
      setError('Please log in to add items to cart');
      return;
    }

    if (!product || !productId) {
      console.error('Invalid product or missing product ID:', product);
      setError('Invalid product data');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, cart: true }));
      const response = await axios.post(
        'http://localhost:5000/api/cart/add',
        { productId, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Add to cart response:', response.data);
      setCartItems(response.data.items || []);
      setError(null);
    } catch (err) {
      console.error('Add to cart error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setLoading(prev => ({ ...prev, cart: false }));
    }
  };

  const updateCartQuantity = async (productId, quantity) => {
    const token = localStorage.getItem('token');
    console.log('Updating cart quantity, token:', token ? 'Present' : 'Missing', 'productId:', productId);

    if (!token) {
      setError('Please log in to update cart');
      return;
    }

    if (!productId) {
      console.error('Missing product ID');
      setError('Invalid product ID');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, cart: true }));
      const response = await axios.put(
        'http://localhost:5000/api/cart/update',
        { productId, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Update cart response:', response.data);
      setCartItems(response.data.items || []);
      setError(null);
    } catch (err) {
      console.error('Update cart error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to update cart');
    } finally {
      setLoading(prev => ({ ...prev, cart: false }));
    }
  };

  const removeFromCart = async (productId) => {
    const token = localStorage.getItem('token');
    console.log('Removing from cart, token:', token ? 'Present' : 'Missing', 'productId:', productId);

    if (!token) {
      setError('Please log in to remove items from cart');
      return;
    }

    if (!productId) {
      console.error('Missing product ID');
      setError('Invalid product ID');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, cart: true }));
      const response = await axios.delete(
        `http://localhost:5000/api/cart/remove/${productId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Remove from cart response:', response.data);
      setCartItems(response.data.items || []);
      setError(null);
    } catch (err) {
      console.error('Remove from cart error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to remove from cart');
    } finally {
      setLoading(prev => ({ ...prev, cart: false }));
    }
  };

  const clearCart = async () => {
    const token = localStorage.getItem('token');
    console.log('Clearing cart, token:', token ? 'Present' : 'Missing');

    if (!token) {
      setError('Please log in to clear cart');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, cart: true }));
      const response = await axios.delete(
        'http://localhost:5000/api/cart/clear',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Clear cart response:', response.data);
      setCartItems(response.data.items || []);
      setError(null);
    } catch (err) {
      console.error('Clear cart error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to clear cart');
    } finally {
      setLoading(prev => ({ ...prev, cart: false }));
    }
  };

  const addToWishlist = async (product) => {
    const token = localStorage.getItem('token');
    const productId = product?._id || product?.productId;
    console.log('Adding to wishlist, token:', token ? 'Present' : 'Missing', 'productId:', productId, 'product:', product);

    if (!token) {
      setError('Please log in to add items to wishlist');
      return;
    }

    if (!product || !productId) {
      console.error('Invalid product or missing product ID:', product);
      setError('Invalid product data');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, wishlist: true }));
      const response = await axios.post(
        'http://localhost:5000/api/wishlist/add',
        { productId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Add to wishlist response:', response.data);
      setWishlistItems(response.data.items || []);
      setError(null);
    } catch (err) {
      console.error('Add to wishlist error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to add to wishlist');
    } finally {
      setLoading(prev => ({ ...prev, wishlist: false }));
    }
  };

  const removeFromWishlist = async (productId) => {
    const token = localStorage.getItem('token');
    console.log('Removing from wishlist, token:', token ? 'Present' : 'Missing', 'productId:', productId);

    if (!token) {
      setError('Please log in to remove items from wishlist');
      return;
    }

    if (!productId) {
      console.error('Missing product ID');
      setError('Invalid product ID');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, wishlist: true }));
      const response = await axios.delete(
        `http://localhost:5000/api/wishlist/remove/${productId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Remove from wishlist response:', response.data);
      setWishlistItems(response.data.items || []);
      setError(null);
    } catch (err) {
      console.error('Remove from wishlist error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to remove from wishlist');
    } finally {
      setLoading(prev => ({ ...prev, wishlist: false }));
    }
  };

  const placeOrder = async (customer, paymentMethod) => {
    const token = localStorage.getItem('token');
    console.log('Placing order, token:', token ? 'Present' : 'Missing');

    if (!token) {
      setError('Please log in to place an order');
      throw new Error('Please log in to place an order');
    }

    try {
      setLoading(prev => ({ ...prev, order: true }));
      const response = await axios.post(
        'http://localhost:5000/api/orders/create',
        { customer, paymentMethod },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Place order response:', response.data);
      setCartItems([]);
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Place order error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to place order');
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, order: false }));
    }
  };

  // Clear error after displaying
  const clearError = () => setError(null);

  const value = {
    cartItems,
    wishlistItems,
    cartCount: cartItems.length,
    wishlistCount: wishlistItems.length,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    addToWishlist,
    removeFromWishlist,
    placeOrder,
    loading,
    error,
    clearError,
  };

  return (
    <CartWishlistContext.Provider value={value}>
      {children}
    </CartWishlistContext.Provider>
  );
};

export default CartWishlistProvider;