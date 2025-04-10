// 📁 src/context/CartContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [message, setMessage] = useState(null);
  const API_BASE_URL = 'http://localhost:5000';
  
  // For testing: Use a hardcoded userId and skip token if auth isn't set up
  const userId = localStorage.getItem('userId') || 'test-user-id'; // Replace with actual auth later
  const token = localStorage.getItem('token') || null; // Replace with actual token later

  // Fetch cart on mount
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/cart/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const items = response.data.items.map(item => ({
          id: item.productId,
          name: item.title,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          variant: item.variant,
        }));
        setCartItems(items);
      } catch (err) {
        console.error('Failed to fetch cart:', err.response?.data || err.message);
      }
    };
    fetchCart();
  }, [userId, token]);

  const addToCart = async (product) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/cart/add`,
        {
          productId: product.id,
          title: product.title,
          price: product.price || (product.variants?.[0]?.price) || 0,
          image: product.images?.[0] || '/placeholder-product.png',
          quantity: 1,
          variant: product.variants?.[0]?.name || null,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      const updatedItems = response.data.cart.items.map(item => ({
        id: item.productId,
        name: item.title,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        variant: item.variant,
      }));
      setCartItems(updatedItems);
      setMessage(`Added ${product.title} to cart!`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to add to cart');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, message }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);