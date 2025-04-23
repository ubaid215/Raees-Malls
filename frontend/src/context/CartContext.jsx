import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [message, setMessage] = useState(null);
  const API_BASE_URL = 'http://localhost:5000';
  const userId = localStorage.getItem('userId') || 'test-user-id';
  const token = localStorage.getItem('token') || null;

  // Fetch cart on mount
  useEffect(() => {
    const fetchCart = async () => {
      try {
        console.log('Fetching cart for userId:', userId);
        const response = await axios.get(`${API_BASE_URL}/api/cart/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        console.log('Fetch cart response:', response.data);
        const items = response.data.items.map((item) => ({
          id: item.productId,
          image: item.image ? `${API_BASE_URL}${item.image}` : '/placeholder-product.png',
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          rating: item.rating || 0,
          reviews: item.reviews || 0,
          stock: item.stock || 0,
          variant: item.variant,
        }));
        setCartItems(items);
      } catch (err) {
        console.error('Failed to fetch cart:', err.response?.data || err.message);
        setMessage('Failed to load cart');
        setTimeout(() => setMessage(null), 3000);
      }
    };
    fetchCart();
  }, [userId, token]);

  // Add to cart
  const addToCart = async (product) => {
    const payload = {
      productId: product._id,
      title: product.title,
      price: product.price || (product.variants?.[0]?.price) || 0,
      image: product.images?.[0] || '/placeholder-product.png',
      quantity: 1,
      rating: product.rating || 0,
      reviews: product.numReviews || 0,
      stock: product.stock || 0,
      variant: product.variants?.[0] || null,
    };
    console.log('Adding to cart with payload:', payload);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cart/add`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      console.log('Add to cart response:', response.data);
      const updatedItems = response.data.cart.items.map((item) => ({
        id: item.productId,
        image: item.image ? `${API_BASE_URL}${item.image}` : '/placeholder-product.png',
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        rating: item.rating || 0,
        reviews: item.reviews || 0,
        stock: item.stock || 0,
        variant: item.variant,
      }));
      setCartItems(updatedItems);
      setMessage(`Added ${product.title} to cart!`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error adding to cart:', err.response?.data || err.message);
      setMessage(err.response?.data?.message || 'Failed to add to cart');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Update cart quantity
  const updateCartQuantity = async (productId, quantity) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/cart/update`,
        { userId, productId, quantity },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      console.log('Update cart quantity response:', response.data);
      const updatedItems = response.data.cart.items.map((item) => ({
        id: item.productId,
        image: item.image ? `${API_BASE_URL}${item.image}` : '/placeholder-product.png',
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        rating: item.rating || 0,
        reviews: item.reviews || 0,
        stock: item.stock || 0,
        variant: item.variant,
      }));
      setCartItems(updatedItems);
      setMessage('Cart updated');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error updating cart quantity:', err.response?.data || err.message);
      setMessage(err.response?.data?.message || 'Failed to update cart');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Remove from cart
  const removeFromCart = async (productId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/cart/${userId}/${productId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      console.log('Remove from cart response:', response.data);
      setCartItems((prev) => prev.filter((item) => item.id !== productId));
      setMessage('Removed from cart');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error removing from cart:', err.response?.data || err.message);
      setMessage(err.response?.data?.message || 'Failed to remove from cart');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, updateCartQuantity, removeFromCart, message }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);