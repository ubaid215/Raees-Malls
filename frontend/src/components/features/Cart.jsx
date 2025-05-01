import React, { useEffect, useState } from 'react';
import { CiShoppingCart, CiTrash, CiCirclePlus, CiCircleMinus } from 'react-icons/ci';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Button from '../core/Button';
import LoadingSkeleton from '../shared/LoadingSkelaton';
import { toast } from 'react-toastify';

function CartProductCard({ item, onUpdateQuantity, onRemove }) {
  if (!item || !item.productId) {
    // console.warn('Invalid cart item:', item);
    return null;
  }

  const formattedPrice = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(item.price || 0);

  const isDisabled = item.isUnavailable || item.isVariantUnavailable;

  return (
    <div className={`w-full bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex flex-col gap-3 ${isDisabled ? 'opacity-60' : ''}`}>
      {/* Warning for unavailable items */}
      {isDisabled && (
        <div className="bg-yellow-100 text-yellow-800 text-xs p-2 rounded-md">
          This {item.isVariantUnavailable ? 'variant' : 'product'} is unavailable
        </div>
      )}
      {/* Image and Title Row */}
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 flex-shrink-0">
          <img
            src={item.image || '/placeholder-product.png'}
            alt={item.title || 'Product'}
            className="w-full h-full object-cover rounded-md"
            onError={(e) => (e.currentTarget.src = '/placeholder-product.png')}
          />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-gray-900 hover:text-red-600 cursor-pointer line-clamp-2">
            {item.title || 'Untitled Product'}
          </h2>
          <p className="text-xs text-gray-600 mt-1">SKU: {item.sku || 'N/A'}</p>
        </div>
      </div>

      {/* Details Section */}
      <div className="space-y-1 text-xs text-gray-600">
        <p className="line-clamp-1">
          Category: {item.category?.name || 'No category'}
        </p>
        <p className="text-green-600">{item.stock || 0} in Stock</p>
      </div>

      {/* Price and Actions Row */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{formattedPrice}</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              onClick={() => onUpdateQuantity(item.productId._id, item.quantity - 1, item.variantId)}
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-2 rounded-full"
              disabled={isDisabled || item.quantity <= 1}
              aria-label={`Decrease quantity of ${item.title}`}
            >
              <CiCircleMinus size={16} />
            </Button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <Button
              onClick={() => onUpdateQuantity(item.productId._id, item.quantity + 1, item.variantId)}
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-2 rounded-full"
              disabled={isDisabled || item.quantity >= (item.stock || 0)}
              aria-label={`Increase quantity of ${item.title}`}
            >
              <CiCirclePlus size={16} />
            </Button>
          </div>
          <Button
            onClick={() => onRemove(item.productId._id, item.variantId)}
            className="bg-red-600 text-white hover:bg-red-700 p-2 rounded-full"
            aria-label={`Remove ${item.title} from cart`}
          >
            <CiTrash size={16} />
          </Button>
        </div>
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
    totalPrice,
    fetchCart,
    addItemToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const navigate = useNavigate();
  const [redirectCount, setRedirectCount] = useState(0);

  useEffect(() => {
    // console.log('Cart: cartItems:', cartItems);
    // console.log('Cart: isLoading:', isLoading, 'error:', error);
  }, [cartItems, isLoading, error]);

  useEffect(() => {
    if (!user && redirectCount < 2) {
      setRedirectCount(prev => prev + 1);
      navigate('/login', { state: { from: '/cart' } });
    } else if (user) {
      fetchCart().catch(err => {
        toast.error('Failed to load cart: ' + (err.message || 'Unknown error'));
      });
    }
  }, [user, navigate, redirectCount, fetchCart]);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    if (cartItems.some(item => item.isUnavailable || item.isVariantUnavailable)) {
      toast.error('Please remove unavailable items before proceeding to checkout');
      return;
    }
    navigate('/checkout', { state: { cartItems } });
  };

  const formattedTotalPrice = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(totalPrice || 0);

  const handleRetry = async () => {
    try {
      await fetchCart();
      toast.success('Cart refreshed');
    } catch (err) {
      toast.error('Failed to refresh cart: ' + (err.message || 'Unknown error'));
    }
  };

  const handleUpdateQuantity = async (productId, newQuantity, variantId) => {
    if (newQuantity < 1) return;
    try {
      const result = await updateQuantity(productId, newQuantity, variantId);
      if (result.success) {
        await fetchCart();
        toast.success('Quantity updated');
      } else {
        toast.error(result.message || 'Failed to update quantity');
      }
    } catch (err) {
      toast.error('Failed to update quantity: ' + (err.message || 'Unknown error'));
    }
  };

  const handleRemoveItem = async (productId, variantId) => {
    try {
      const result = await removeFromCart(productId, variantId);
      if (result.success) {
        await fetchCart();
        toast.success('Item removed from cart');
      } else {
        toast.error(result.message || 'Failed to remove item');
      }
    } catch (err) {
      toast.error('Failed to remove item: ' + (err.message || 'Unknown error'));
    }
  };

  const handleClearCart = async () => {
    try {
      const result = await clearCart();
      if (result.success) {
        await fetchCart();
        toast.success('Cart cleared');
      } else {
        toast.error(result.message || 'Failed to clear cart');
      }
    } catch (err) {
      toast.error('Failed to clear cart: ' + (err.message || 'Unknown error'));
    }
  };

  if (isLoading && !cartItems.length) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <LoadingSkeleton type="text" width="40" height="6" className="mb-6 mx-auto" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-3 flex gap-3">
                <LoadingSkeleton type="image" width="16" height="16" />
                <div className="flex-1 space-y-2">
                  <LoadingSkeleton type="text" width="60" height="4" />
                  <LoadingSkeleton type="text" width="40" height="3" />
                  <LoadingSkeleton type="text" width="30" height="3" />
                </div>
                <LoadingSkeleton type="text" width="16" height="8" />
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
        <div className="bg-white rounded-lg shadow-sm p-6 text-center max-w-sm w-full">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CiShoppingCart className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-base font-medium text-gray-700 mb-2">Unable to load your cart</h3>
          <p className="text-sm text-gray-500 mb-4">
            {error.status === 403
              ? 'Please login to view your cart'
              : error.message || 'An error occurred'}
          </p>
          <div className="space-y-2">
            {error.status === 403 ? (
              <Button
                onClick={() => navigate('/login', { state: { from: '/cart' } })}
                className="w-full bg-red-600 text-white hover:bg-red-700 py-2 rounded-md"
              >
                Login
              </Button>
            ) : (
              <Button
                onClick={handleRetry}
                className="w-full bg-red-600 text-white hover:bg-red-700 py-2 rounded-md"
              >
                Try Again
              </Button>
            )}
            <Button
              onClick={() => navigate('/products')}
              className="w-full bg-white text-gray-700 border border-red-500 hover:bg-red-50 py-2 rounded-md"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-6">
          Your Shopping Cart
          {cartItems.length > 0 && (
            <span className="block text-xs md:text-sm font-normal text-gray-500 mt-1">
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
            </span>
          )}
        </h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CiShoppingCart className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-sm text-gray-500 mb-4">Looks like you haven't added any items yet</p>
            <Button
              onClick={() => navigate('/products')}
              className="w-full bg-red-600 text-white hover:bg-red-700 py-2 rounded-md"
            >
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
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
                    <tr key={`${item.productId._id}-${item.variantId || 'no-variant'}`} className={`border-b border-gray-200 last:border-b-0 ${item.isUnavailable || item.isVariantUnavailable ? 'opacity-60' : ''}`}>
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
                            Category: {item.category?.name || 'No category'}
                          </p>
                          {(item.isUnavailable || item.isVariantUnavailable) && (
                            <p className="text-sm text-yellow-600">
                              This {item.isVariantUnavailable ? 'variant' : 'product'} is unavailable
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleUpdateQuantity(item.productId._id, item.quantity - 1, item.variantId)}
                            className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-2 rounded-full"
                            disabled={item.isUnavailable || item.isVariantUnavailable || item.quantity <= 1}
                          >
                            <CiCircleMinus size={20} />
                          </Button>
                          <span className="w-12 text-center text-sm">{item.quantity}</span>
                          <Button
                            onClick={() => handleUpdateQuantity(item.productId._id, item.quantity + 1, item.variantId)}
                            className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-2 rounded-full"
                            disabled={item.isUnavailable || item.isVariantUnavailable || item.quantity >= (item.stock || 0)}
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
                        }).format((item.price || 0) * item.quantity)}
                      </td>
                      <td className="p-4">
                        <Button
                          onClick={() => handleRemoveItem(item.productId._id, item.variantId)}
                          className="bg-red-600 text-white hover:bg-red-700 p-2 rounded-full"
                        >
                          <CiTrash size={20} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="block md:hidden space-y-4">
              {cartItems.map((item) => (
                <CartProductCard
                  key={`${item.productId._id}-${item.variantId || 'no-variant'}`}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm md:text-base font-semibold text-gray-900">
                  Total: {formattedTotalPrice}
                </h3>
                <Button
                  onClick={handleClearCart}
                  className="bg-gray-600 text-white hover:bg-gray-700 px-4 py-2 rounded-md text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? 'Clearing...' : 'Clear Cart'}
                </Button>
              </div>
              <Button
                onClick={handleCheckout}
                className="w-full bg-red-600 text-white hover:bg-red-700 py-2 rounded-md text-sm"
                aria-label="Proceed to checkout"
                disabled={isLoading || cartItems.length === 0}
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