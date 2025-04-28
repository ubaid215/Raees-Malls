import React, { createContext, useState, useEffect } from 'react';
import { addToWishlist, getWishlist, removeFromWishlist } from '../services/wishlistService';
import socketService from '../services/socketService';

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const adminToken = localStorage.getItem('adminToken');

    if (userId) {
      socketService.connect(userId, adminToken ? 'admin' : 'user');
      fetchWishlist();
      socketService.on('wishlistUpdated', fetchWishlist);
    }

    return () => {
      socketService.off('wishlistUpdated', fetchWishlist);
      // socketService.disconnect(); // Optional
    };
  }, []);

  const fetchWishlist = async () => {
    setLoading(true);
    setError('');
    try {
      const wishlistData = await getWishlist();
      setWishlist(wishlistData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItemToWishlist = async (productId, variantId = null) => {
    setLoading(true);
    setError('');
    try {
      await addToWishlist(productId, variantId);
      await fetchWishlist();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeItemFromWishlist = async (productId, variantId = null) => {
    setLoading(true);
    setError('');
    try {
      await removeFromWishlist(productId, variantId);
      await fetchWishlist();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    wishlist,
    loading,
    error,
    addItemToWishlist,
    removeItemFromWishlist,
    fetchWishlist,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};