import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCartWishlist } from '../../context/CartWishlistContext';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500',
    outline: 'border border-red-300 hover:bg-red-50 text-gray-700 focus:ring-red-500',
    ghost: 'hover:bg-gray-100 text-gray-700 focus:ring-red-500',
    danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
  };

  const sizeStyles = {
    small: 'px-3 py-2 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`
        rounded-md font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-70 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${fullWidth ? 'w-full' : 'w-auto'}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin h-5 w-5" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="h-5 w-5" />}
          {children}
        </>
      )}
    </button>
  );
};

function Checkout() {
  const { cartItems, clearCart } = useCartWishlist();
  console.log('CartWishlistContext:', { cartItems, clearCart }); // Debug context

  if (!clearCart) {
    console.error('clearCart is not available in CartWishlistContext');
    return <div className="text-center text-red-500">Error: Cart context not properly configured</div>;
  }

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    paymentMethod: 'cod',
  });
  const [isLoading, setIsLoading] = useState(false);

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveOrder = () => {
    const order = {
      id: `#${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      total: `${totalPrice.toFixed(2)} PKR`,
      status: 'pending',
      customer: { ...formData },
      items: cartItems.map((item, index) => ({
        id: `${item.productId}-${index}`,
        name: item.title,
        access: 'Lifetime access',
        price: `${(item.price * item.quantity).toFixed(2)} PKR`,
        image: item.image,
        quantity: item.quantity, // Added quantity
      })),
    };

    const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    localStorage.setItem('orders', JSON.stringify([...existingOrders, order]));
    return order;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const order = saveOrder();
      console.log('Order submitted:', { ...formData, cartItems, totalPrice, orderId: order.id });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      clearCart();
      alert('Order placed successfully!');
    } catch (error) {
      console.error('Order submission failed:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppOrder = () => {
    const order = saveOrder();
    const message = `New Order:\n${cartItems
      .map((item) => `${item.title} - ${item.quantity} x ${item.price.toFixed(2)} PKR`)
      .join('\n')}\nTotal: ${totalPrice.toFixed(2)} PKR\n\nCustomer: ${formData.name}\nAddress: ${formData.address}, ${formData.city}, ${formData.postalCode}, ${formData.country}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/+923006530063?text=${encodedMessage}`;
    clearCart();
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 py-8">
      <h1 className="text-center lg:text-4xl text-2xl font-bold text-gray-800 pb-8">
        Checkout
      </h1>

      <section className="w-full max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-2/3">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Billing Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Shipping Address</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Method</h2>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={handleInputChange}
                      className="text-red-500 focus:ring-red-500"
                    />
                    <span className="text-gray-700">Cash on Delivery</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={formData.paymentMethod === 'card'}
                      onChange={handleInputChange}
                      className="text-red-500 focus:ring-red-500"
                    />
                    <span className="text-gray-700">Credit/Debit Card</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  fullWidth
                  isLoading={isLoading}
                >
                  Order Now
                </Button>
                <Button
                  variant="secondary"
                  size="large"
                  fullWidth
                  onClick={handleWhatsAppOrder}
                  disabled={isLoading}
                >
                  Order on WhatsApp
                </Button>
              
              </div>
            </form>
          </div>

          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Summary</h2>
              {cartItems.length === 0 ? (
                <p className="text-gray-500">Your cart is empty.</p>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.productId} className="flex items-center gap-4">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => (e.currentTarget.src = '/placeholder-product.png')}
                      />
                      <div className="flex-1">
                        <h3 className="text-md font-semibold text-gray-800">{item.title}</h3>
                        <p className="text-sm text-gray-600">
                          {item.quantity} x {item.price.toFixed(2)} PKR
                        </p>
                      </div>
                      <p className="text-md font-medium text-gray-800">
                        {(item.price * item.quantity).toFixed(2)} PKR
                      </p>
                    </div>
                  ))}
                  <hr />
                  <div className="flex justify-between text-lg font-semibold text-gray-800">
                    <span>Total</span>
                    <span>{totalPrice.toFixed(2)} PKR</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Checkout;