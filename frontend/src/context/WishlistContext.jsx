import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [message, setMessage] = useState(null);
  const API_BASE_URL = 'http://localhost:5000';
  const userId = localStorage.getItem('userId') || 'test-user-id';
  const token = localStorage.getItem('token') || null;

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        console.log('Fetching wishlist for userId:', userId);
        const response = await axios.get(`${API_BASE_URL}/api/wishlist/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        console.log('Fetch wishlist response:', response.data);
        const items = response.data.items.map((item) => ({
          _id: item.productId, // Use _id instead of id
          image: item.image ? `${API_BASE_URL}${item.image}` : '/placeholder-product.png',
          title: item.title,
          price: item.price,
          rating: item.rating || 0,
          reviews: item.reviews || 0,
          stock: item.stock || 0,
        }));
        setWishlistItems(items);
      } catch (err) {
        console.error('Failed to fetch wishlist:', err.response?.data || err.message);
        setMessage('Failed to load wishlist');
        setTimeout(() => setMessage(null), 3000);
      }
    };
    fetchWishlist();
  }, [userId, token]);

  const addToWishlist = async (product) => {
    const payload = {
      productId: product._id,
      title: product.title,
      price: product.price,
      image: product.images?.[0] || '/placeholder-product.png',
      rating: product.rating || 0,
      reviews: product.numReviews || 0,
      stock: product.stock || 0,
    };
    console.log('Adding to wishlist with payload:', payload);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/wishlist/add`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      console.log('Add to wishlist response:', response.data);
      const newItem = {
        _id: payload.productId, // Use _id
        image: payload.image ? `${API_BASE_URL}${payload.image}` : '/placeholder-product.png',
        title: payload.title,
        price: payload.price,
        rating: payload.rating,
        reviews: payload.reviews,
        stock: payload.stock,
      };
      setWishlistItems((prev) => {
        if (prev.some((item) => item._id === newItem._id)) {
          return prev;
        }
        return [...prev, newItem];
      });
      setMessage(`Added ${product.title} to wishlist!`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error adding to wishlist:', err.response?.data || err.message);
      setMessage(err.response?.data?.message || 'Failed to add to wishlist');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/wishlist/${userId}/${productId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      console.log('Remove from wishlist response:', response.data);
      setWishlistItems((prev) => prev.filter((item) => item._id !== productId));
      setMessage('Removed from wishlist');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error removing from wishlist:', err.response?.data || err.message);
      setMessage(err.response?.data?.message || 'Failed to remove from wishlist');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some((item) => item._id === productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlistItems, addToWishlist, removeFromWishlist, isInWishlist, message }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);