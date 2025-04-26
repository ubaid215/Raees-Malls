import React, { useState } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Button from '../components/core/Button';
import Input from '../components/core/Input';
import { useCart } from '../context/CartContext';
import { placeOrder } from '../services/orderApi';

const CheckoutPage = () => {
  const { cartItems, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
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
    },
  });

  const calculateTotal = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = 10; // Fixed shipping cost
    const tax = 0; // Fixed tax
    return { subtotal, shipping, tax, total: subtotal + shipping + tax };
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const order = {
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          sku: item.sku || 'UNKNOWN_SKU', // Fallback if sku is missing
          price: item.price,
        })),
        shippingAddress: {
          fullName: `${data.firstName} ${data.lastName}`,
          addressLine1: data.address1,
          addressLine2: data.address2 || '',
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
          phone: data.phone,
        },
        paymentMethod: data.paymentMethod,
        ...calculateTotal(),
      };

      const response = await placeOrder(order);
      if (response.data.success) {
        clearCart();
        setOrderSuccess(true);
        toast.success(response.data.message || 'Order placed successfully!');
      } else {
        throw new Error(response.data.message || 'Order submission failed');
      }
    } catch (error) {
      toast.error(error.message || 'Order submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="w-full min-h-screen bg-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-md bg-white shadow-lg rounded-lg p-6 text-center">
          <FiCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for your order. We've sent a confirmation to your email.
          </p>
          <Button
            as="a"
            href="/"
            variant="primary"
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 transition-all"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  const { subtotal, shipping, tax, total } = calculateTotal();

  return (
    <div className="w-full min-h-screen bg-gray-100 flex items-start justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-7xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Contact and Shipping */}
          <div className="lg:col-span-2">
            <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Contact Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                <Input
                  label="Email address"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Invalid email address',
                    },
                  })}
                  type="email"
                  className="py-2 px-3"
                  error={errors.email?.message}
                />
              </div>

              {/* Shipping Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Input
                    label="First name"
                    {...register('firstName', { required: 'First name is required' })}
                    className="py-2 px-3"
                    error={errors.firstName?.message}
                  />
                  <Input
                    label="Last name"
                    {...register('lastName', { required: 'Last name is required' })}
                    className="py-2 px-3"
                    error={errors.lastName?.message}
                  />
                </div>
                <Input
                  label="Phone number"
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^\+?\d{10,15}$/,
                      message: 'Invalid phone number',
                    },
                  })}
                  type="tel"
                  className="py-2 px-3 mb-4"
                  error={errors.phone?.message}
                />
                <Input
                  label="Address line 1"
                  {...register('address1', { required: 'Address is required' })}
                  className="py-2 px-3 mb-4"
                  error={errors.address1?.message}
                />
                <Input
                  label="Address line 2 (Optional)"
                  {...register('address2')}
                  className="py-2 px-3 mb-4"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <select
                      {...register('country', { required: 'Country is required' })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm py-2 px-3"
                    >
                      <option value="Pakistan">Pakistan</option>
                      <option value="United States">United States</option>
                      {/* Add more countries as needed */}
                    </select>
                    {errors.country && (
                      <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
                    )}
                  </div>
                  <Input
                    label="City"
                    {...register('city', { required: 'City is required' })}
                    className="py-2 px-3"
                    error={errors.city?.message}
                  />
                  <Input
                    label="State"
                    {...register('state', { required: 'State is required' })}
                    className="py-2 px-3"
                    error={errors.state?.message}
                  />
                  <Input
                    label="Postal code"
                    {...register('postalCode', { required: 'Postal code is required' })}
                    className="py-2 px-3"
                    error={errors.postalCode?.message}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      {...register('paymentMethod', { required: 'Payment method is required' })}
                      value="cod"
                      className="mr-2"
                    />
                    Cash on Delivery
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      {...register('paymentMethod')}
                      value="card"
                      className="mr-2"
                    />
                    Credit/Debit Card
                  </label>
                  {errors.paymentMethod && (
                    <p className="mt-1 text-sm text-red-600">{errors.paymentMethod.message}</p>
                  )}
                </div>
              </div>

              {/* Submit Button for Mobile */}
              <div className="lg:hidden mt-6">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 transition-all"
                  disabled={isSubmitting || cartItems.length === 0}
                >
                  {isSubmitting ? 'Processing...' : 'Place Order'}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {cartItems.map((item, index) => (
                  <div key={`${item.id}-${item.variant || index}`} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.image || '/placeholder-product.png'}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-md border border-gray-200"
                        onError={(e) => (e.currentTarget.src = '/placeholder-product.png')}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.variant && (
                          <p className="text-sm text-gray-600">{item.variant}</p>
                        )}
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
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
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 transition-all"
                  disabled={isSubmitting || cartItems.length === 0}
                >
                  {isSubmitting ? 'Processing...' : 'Place Order'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;