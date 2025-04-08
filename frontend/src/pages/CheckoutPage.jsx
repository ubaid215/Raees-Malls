// src/components/CheckoutPage.jsx
import React, { useState } from 'react';
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import Button from '../components/core/Button';
import Input from '../components/core/Input';
import { useCart } from '../context/CartContext';
import { createOrder } from '../services/orderAPI';

const CheckoutPage = () => {
  const { cartItems, clearCart } = useCart();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address1: '',
    address2: '',
    country: 'Pakistan',
    city: '',
    state: '',
    postalCode: '',
    paymentMethod: 'cod',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateTotal = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = 10; // Fixed shipping cost
    const tax = 0; // Fixed tax for now
    return {
      subtotal,
      shipping,
      tax,
      total: subtotal + shipping + tax,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const order = {
        ...formData,
        items: cartItems,
        ...calculateTotal(),
        status: 'pending',
      };

      await createOrder(order);
      clearCart();
      setOrderSuccess(true);
    } catch (error) {
      console.error('Order failed:', error);
      alert('Order submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="max-w-md mx-auto p-6 text-center animate-fadeIn">
        <FiCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold mb-2">Order Placed Successfully!</h2>
        <p className="text-gray-600 mb-6">
          Thank you for your order. We've sent a confirmation to your email.
        </p>
        <Button
          as="a"
          href="/"
          variant="primary"
          className="transform transition-all duration-300 hover:scale-105"
        >
          Continue Shopping
        </Button>
      </div>
    );
  }

  const { subtotal, shipping, tax, total } = calculateTotal();

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <h1 className="text-3xl font-bold mb-8 animate-slideInLeft">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Contact and Shipping */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Contact Information */}
            <div className="animate-slideInLeft">
              <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
              <Input
                label="Email address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Shipping Information */}
            <div className="animate-slideInLeft">
              <h2 className="text-xl font-semibold mb-4">Shipping Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <Input
                  label="First name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Input
                  label="Last name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Input
                label="Phone number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md p-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Input
                label="Address line 1"
                name="address1"
                value={formData.address1}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md p-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Input
                label="Address line 2"
                name="address2"
                value={formData.address2}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="United States">United States</option>
                    {/* Add more countries as needed */}
                  </select>
                </div>
                <Input
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Input
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Input
                  label="Postal code"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Submit Button for Mobile */}
            <div className="lg:hidden mt-6">
              <Button
                type="submit"
                variant="primary"
                className="w-full bg-black text-white py-3 rounded-md transform transition-all duration-300 hover:scale-105"
                disabled={isSubmitting || cartItems.length === 0}
              >
                {isSubmitting ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column - Order Summary */}
        <div className="animate-slideInRight">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Order details</h2>

            {/* Cart Items */}
            <div className="space-y-4 mb-6">
              {cartItems.map((item, index) => (
                <div
                  key={`${item.id}-${item.variant || index}`}
                  className="flex items-center justify-between animate-fadeIn"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.variant && (
                        <p className="text-sm text-gray-600">{item.variant}</p>
                      )}
                    </div>
                  </div>
                  <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Order Totals */}
            <div className="space-y-2 border-t border-gray-200 pt-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Confirm Payment Button for Desktop */}
            <div className="hidden lg:block">
              <Button
                type="submit"
                form="checkout-form"
                variant="primary"
                className="w-full bg-black text-white py-3 rounded-md transform transition-all duration-300 hover:scale-105"
                disabled={isSubmitting || cartItems.length === 0}
              >
                {isSubmitting ? 'Processing...' : 'Place Order'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;