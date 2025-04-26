import React, { useEffect, useState, useContext } from 'react';
import { CiShoppingCart, CiTrash, CiCirclePlus, CiCircleMinus } from 'react-icons/ci';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useCartWishlist } from '../../context/CartWishlistContext';
import Button from '../core/Button';
import { toast } from 'react-toastify';
import LoadingSkeleton from '../shared/LoadingSkelaton';
import { getCart, updateCartQuantity, removeFromCart } from '../../services/OrderAPI';

function CartProductCard({ item }) {
  const { updateCartQuantity: updateContextQuantity, removeFromCart: removeFromContext } = useCartWishlist();

  const handleUpdateQuantity = async (quantity) => {
    try {
      await updateCartQuantity(item._id, quantity);
      updateContextQuantity(item._id, quantity);
    } catch (err) {
      toast.error('Failed to update quantity');
    }
  };

  const handleRemove = async () => {
    try {
      await removeFromCart(item._id);
      removeFromContext(item._id);
      toast.success('Item removed from cart');
    } catch (err) {
      toast.error('Failed to remove item');
    }
  };

  const formattedPrice = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(item.price);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row items-center bg-white rounded-lg shadow-sm border border-gray-200 p-4 gap-4">
      <div className="w-full sm:w-24 h-24">
        <img
          src={item.images[0]?.url || '/placeholder-product.png'}
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
            onClick={() => handleUpdateQuantity(item.quantity - 1)}
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-1"
            disabled={item.quantity <= 1}
            aria-label={`Decrease quantity of ${item.title}`}
          >
            <CiCircleMinus size={20} />
          </Button>
          <span className="w-12 text-center text-sm sm:text-base">{item.quantity}</span>
          <Button
            onClick={() => handleUpdateQuantity(item.quantity + 1)}
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-1"
            disabled={item.quantity >= item.stock}
            aria-label={`Increase quantity of ${item.title}`}
          >
            <CiCirclePlus size={20} />
          </Button>
        </div>
        <Button
          onClick={handleRemove}
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
  const { cartItems, setCartItems } = useCartWishlist();
  const { user } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const navigate = useNavigate();

  const fetchCart = async () => {
    if (!user || !localStorage.getItem('accessToken')) {
      setFetchError('Please log in to view your cart');
      setIsLoading(false);
      navigate('/login');
      return;
    }

    try {
      setIsLoading(true);
      const response = await getCart();
      if (response.data.success) {
        setCartItems(response.data.items || []);
        setFetchError(null);
      } else {
        throw new Error(response.data.message || 'Failed to fetch cart');
      }
    } catch (err) {
      setFetchError(err.message || 'Failed to fetch cart');
      toast.error(err.message || 'Failed to fetch cart');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setFetchError('Please log in to view your cart');
      navigate('/login');
    }
  }, [user, navigate]);

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const formattedTotalPrice = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(totalPrice);

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please log in to proceed to checkout');
      navigate('/login');
      return;
    }
    navigate('/checkout', { state: { cartItems } });
  };

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center max-w-md w-full">
          <p className="text-red-600 text-lg font-medium">{fetchError}</p>
          <Button
            onClick={() => navigate('/login')}
            className="mt-4 w-full bg-red-600 text-white hover:bg-red-700"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8">
          Your Shopping Cart
        </h1>
        {cartItems.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-600 text-base sm:text-lg mb-4">Your cart is empty.</p>
            <Button
              onClick={() => navigate('/products')}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Shop Now
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
                    <tr key={item._id} className="border-b border-gray-200 last:border-b-0">
                      <td className="p-4 flex items-center gap-4">
                        <img
                          src={item.images[0]?.url || '/placeholder-product.png'}
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
                            onClick={() => handleUpdateQuantity(item.quantity - 1)}
                            className="border border-gray-300 text-gray-600 hover:bg-gray-50 p-1"
                            disabled={item.quantity <= 1}
                          >
                            <CiCircleMinus size={20} />
                          </Button>
                          <span className="w-12 text-center text-sm sm:text-base">{item.quantity}</span>
                          <Button
                            onClick={() => handleUpdateQuantity(item.quantity + 1)}
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
                          onClick={handleRemove}
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
                <CartProductCard key={item._id} item={item} />
              ))}
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Total Price: {formattedTotalPrice}
              </h3>
              <Button
                onClick={handleCheckout}
                className="w-full sm:w-auto bg-red-600 text-white hover:bg-red-700"
                disabled={cartItems.length === 0}
                aria-label="Proceed to checkout"
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;