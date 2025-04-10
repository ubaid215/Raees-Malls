/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cart from '../features/Cart';
import { useCart } from '../../context/CartContext';

const CartContainer = () => {
  const { cartItems, message } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = 'YOUR_USER_ID_HERE'; // Replace with actual userId
  const API_BASE_URL = 'http://localhost:5000';
  const token = localStorage.getItem('token');

  // Fetch cart data on mount (optional if context handles it)
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/cart/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch cart');
        setLoading(false);
      }
    };

    fetchCart();
  }, [userId, token]);

  const handleQuantityChange = async (productId, newQuantity) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/cart/update`,
        { productId, quantity: newQuantity },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Context will update cartItems, so no need to set state here
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update quantity');
    }
  };

  const handleRemoveItem = async (productId) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/cart/remove/${productId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Context will update cartItems
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove item');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading cart...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <>
      {message && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50">
          {message}
        </div>
      )}
      <Cart
        cartItems={cartItems}
        onQuantityChange={handleQuantityChange}
        onRemoveItem={handleRemoveItem}
      />
    </>
  );
};

export default CartContainer;