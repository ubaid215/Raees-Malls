import React, { useEffect, useState } from 'react';
import { CiShoppingCart, CiTrash, CiCirclePlus, CiCircleMinus } from 'react-icons/ci';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Button from '../core/Button';
import LoadingSkeleton from '../shared/LoadingSkelaton';

function CartProductCard({ item, onUpdateQuantity, onRemove }) {
  const formattedPrice = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(item.price);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row items-center bg-white rounded-lg shadow-sm border border-gray-200 p-4 gap-4">
      <div className="w-full sm:w-24 h-24">
        <img
          src={item.image || '/placeholder-product.png'}
          alt={item.title}
          className="w-full h-full object-cover rounded-lg"
          onError={(e) => (e.currentTarget.src = '/placeholder-product.png')}
        />
      </div>
      <div className="flex-1 text-center sm:text-left space-y-1">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 hover:text-red-600 cursor-pointer">
          {item.title}
        </h2>
        <p className="text-sm text-gray-600">SKU: {item.sku || 'N/A'}</p>
        <p className="text-sm text-gray-600 truncate">
          Categories: {item.categories?.map((cat) => cat.name).join(', ') || 'No categories'}
        </p>
        <p className="text-base font-medium text-gray-900">{formattedPrice}</p>
        <p className="text-sm text-yellow-500">
          {'⭐'.repeat(Math.floor(item.rating || 0))}
          {item.rating % 1 >= 0.5 && '½'} ({item.numReviews || 0})
        </p>
        <p className="text-sm text-green-600">{item.stock} in Stock</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-1"
            disabled={item.quantity <= 1}
            aria-label={`Decrease quantity of ${item.title}`}
          >
            <CiCircleMinus size={20} />
          </Button>
          <span className="w-12 text-center text-sm sm:text-base">{item.quantity}</span>
          <Button
            onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-1"
            disabled={item.quantity >= item.stock}
            aria-label={`Increase quantity of ${item.title}`}
          >
            <CiCirclePlus size={20} />
          </Button>
        </div>
        <Button
          onClick={() => onRemove(item.productId)}
          className="bg-red-600 text-white hover:bg-red-700 p-1 flex items-center gap-1"
          aria-label={`Remove ${item.title} from cart`}
        >
          <CiTrash size={20} />
          <span className="text-sm">Remove</span>
        </Button>
      </div>
    </div>
  );
}

function Cart() {
  const { user } = useAuth();
  const { 
    cartItems, 
    isLoading, 
    error, 
    updateQuantity, 
    removeItem, 
    clearCart, 
    totalPrice,
    fetchCart
  } = useCart();
  const navigate = useNavigate();
  const [redirectCount, setRedirectCount] = useState(0);

  useEffect(() => {
    if (!user && redirectCount < 2) {
      setRedirectCount(prev => prev + 1);
      navigate('/login', { state: { from: '/cart' } });
    }
  }, [user, navigate, redirectCount]);

  const handleCheckout = () => {
    navigate('/checkout', { state: { cartItems } });
  };

  const formattedTotalPrice = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(totalPrice);

  const handleRetry = () => {
    fetchCart();
  };

  if (isLoading && !cartItems.length) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSkeleton type="text" width="64" height="8" className="mb-8 mx-auto" />
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4 flex gap-4">
                <LoadingSkeleton type="image" width="24" height="24" />
                <div className="flex-1 space-y-2">
                  <LoadingSkeleton type="text" width="80" height="5" />
                  <LoadingSkeleton type="text" width="60" height="4" />
                  <LoadingSkeleton type="text" width="40" height="4" />
                </div>
                <LoadingSkeleton type="text" width="24" height="10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CiShoppingCart className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Unable to load your cart</h3>
          <p className="text-gray-500 mb-6">
            {error.status === 403 
              ? 'Please login to view your cart' 
              : error.message || 'An error occurred'}
          </p>
          <div className="space-y-3">
            {error.status === 403 ? (
              <Button
                onClick={() => navigate('/login', { state: { from: '/cart' } })}
                className="w-full bg-red-600 text-white hover:bg-red-700"
              >
                Login
              </Button>
            ) : (
              <Button
                onClick={handleRetry}
                className="w-full bg-red-600 text-white hover:bg-red-700"
              >
                Try Again
              </Button>
            )}
            <Button
              onClick={() => navigate('/products')}
              className="w-full bg-white text-gray-700 border border-red-500 hover:bg-red-50"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8">
          Your Shopping Cart
          {cartItems.length > 0 && (
            <span className="block text-sm font-normal text-gray-500 mt-1">
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
            </span>
          )}
        </h1>
        
        {cartItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CiShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-500 mb-6">Looks like you haven't added any items yet</p>
            <Button
              onClick={() => navigate('/products')}
              className="w-full bg-red-600 text-white hover:bg-red-700"
            >
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="p-4 text-gray-900 font-semibold">Product</th>
                    <th className="p-4 text-gray-900 font-semibold">Quantity</th>
                    <th className="p-4 text-gray-900 font-semibold">Price</th>
                    <th className="p-4 text-gray-900 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item) => (
                    <tr key={item.productId} className="border-b border-gray-200 last:border-b-0">
                      <td className="p-4 flex items-center gap-4">
                        <img
                          src={item.image || '/placeholder-product.png'}
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded-lg"
                          onError={(e) => (e.currentTarget.src = '/placeholder-product.png')}
                        />
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 hover:text-red-600 cursor-pointer">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-600">SKU: {item.sku || 'N/A'}</p>
                          <p className="text-sm text-gray-600 truncate">
                            Categories: {item.categories?.map((cat) => cat.name).join(', ') || 'No categories'}
                          </p>
                          <p className="text-sm text-yellow-500">
                            {'⭐'.repeat(Math.floor(item.rating || 0))}
                            {item.rating % 1 >= 0.5 && '½'} ({item.numReviews || 0})
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-1"
                            disabled={item.quantity <= 1}
                          >
                            <CiCircleMinus size={20} />
                          </Button>
                          <span className="w-12 text-center text-sm sm:text-base">{item.quantity}</span>
                          <Button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-1"
                            disabled={item.quantity >= item.stock}
                          >
                            <CiCirclePlus size={20} />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4 text-gray-900">
                        {new Intl.NumberFormat('en-PK', {
                          style: 'currency',
                          currency: 'PKR',
                          minimumFractionDigits: 0,
                        }).format(item.price * item.quantity)}
                      </td>
                      <td className="p-4">
                        <Button
                          onClick={() => removeItem(item.productId)}
                          className="bg-red-600 text-white hover:bg-red-700 p-1"
                        >
                          <CiTrash size={20} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="block md:hidden space-y-6">
              {cartItems.map((item) => (
                <CartProductCard 
                  key={item.productId} 
                  item={item} 
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Total: {formattedTotalPrice}
                </h3>
                <Button
                  onClick={clearCart}
                  className="bg-gray-600 text-white hover:bg-gray-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Clearing...' : 'Clear Cart'}
                </Button>
              </div>
              <Button
                onClick={handleCheckout}
                className="w-full sm:w-auto bg-red-600 text-white hover:bg-red-700"
                aria-label="Proceed to checkout"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Proceed to Checkout'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;