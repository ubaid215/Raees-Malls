import React from 'react';
import { CiHeart, CiShoppingCart, CiTrash, CiCirclePlus, CiCircleMinus } from 'react-icons/ci';
import { DotIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCartWishlist } from '../../context/CartWishlistContext';
import Button from '../core/Button';

function CartProductCard({ productId, image, title, price, rating, reviews, stock, quantity }) {
  const { updateCartQuantity, removeFromCart } = useCartWishlist();

  return (
    <div className="w-full max-w-md flex flex-col sm:flex-row items-center bg-white rounded-xl shadow-lg p-4 gap-4">
      <div className="relative w-full sm:w-32 h-32 overflow-hidden group">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
          onError={(e) => (e.currentTarget.src = '/placeholder-product.png')}
        />
        <CiHeart
          className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          size={20}
          strokeWidth={1}
        />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <h2 className="text-lg font-bold text-gray-800 cursor-pointer hover:text-red-500">
          {title}
        </h2>
        <p className="text-md text-gray-600">{price.toFixed(2)} PKR</p>
        <p className="text-sm text-gray-500">
          {'⭐'.repeat(rating)} ({reviews})
        </p>
        <p className="flex items-center justify-center sm:justify-start gap-2 text-green-500 text-sm">
          <DotIcon size={24} /> {stock} in Stock
        </p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => updateCartQuantity(productId, quantity - 1)}
            variant="secondary"
            size="small"
            disabled={quantity <= 1}
            aria-label={`Decrease quantity of ${title}`}
          >
            <CiCircleMinus size={16} strokeWidth={1} />
          </Button>
          <span className="w-12 text-center">{quantity}</span>
          <Button
            onClick={() => updateCartQuantity(productId, quantity + 1)}
            variant="secondary"
            size="small"
            disabled={quantity >= stock}
            aria-label={`Increase quantity of ${title}`}
          >
            <CiCirclePlus size={16} strokeWidth={1} />
          </Button>
        </div>
        <Button
          onClick={() => removeFromCart(productId)}
          variant="danger"
          size="small"
          aria-label={`Remove ${title} from cart`}
        >
          <CiTrash size={16} strokeWidth={1} />
          <span className="text-sm">Remove</span>
        </Button>
      </div>
    </div>
  );
}

function Cart() {
  const { cartItems } = useCartWishlist();
  const navigate = useNavigate();

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    navigate('/checkout', { state: { cartItems } });
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 py-8">
      <h1 className="text-center lg:text-4xl text-2xl font-bold text-gray-800 pb-8">
        Your Shopping Cart
      </h1>
      <section className="w-full max-w-7xl mx-auto px-4 lg:px-8">
        {cartItems.length === 0 ? (
          <p className="text-center text-gray-500 text-lg">Your cart is empty.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="hidden md:block bg-white rounded-lg shadow-md">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-gray-700 font-semibold">Product</th>
                    <th className="p-4 text-gray-700 font-semibold">Quantity</th>
                    <th className="p-4 text-gray-700 font-semibold">Price</th>
                    <th className="p-4 text-gray-700 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item) => (
                    <tr key={item.productId} className="border-b last:border-b-0">
                      <td className="p-4 flex items-center gap-4">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded-lg"
                          onError={(e) => (e.currentTarget.src = '/placeholder-product.png')}
                        />
                        <div>
                          <h3 className="text-md font-semibold text-gray-800">{item.title}</h3>
                          <p className="text-sm text-gray-500">
                            {'⭐'.repeat(item.rating)} ({item.reviews})
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                            variant="secondary"
                            size="small"
                            disabled={item.quantity <= 1}
                          >
                            <CiCircleMinus size={16} strokeWidth={1} />
                          </Button>
                          <span className="w-12 text-center">{item.quantity}</span>
                          <Button
                            onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                            variant="secondary"
                            size="small"
                            disabled={item.quantity >= item.stock}
                          >
                            <CiCirclePlus size={16} strokeWidth={1} />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">
                        {(item.price * item.quantity).toFixed(2)} PKR
                      </td>
                      <td className="p-4">
                        <Button
                          onClick={() => removeFromCart(item.productId)}
                          variant="danger"
                          size="small"
                        >
                          <CiTrash size={16} strokeWidth={1} />
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
                  productId={item.productId}
                  image={item.image}
                  title={item.title}
                  price={item.price}
                  rating={item.rating}
                  reviews={item.reviews}
                  stock={item.stock}
                  quantity={item.quantity}
                />
              ))}
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Total Price: {totalPrice.toFixed(2)} PKR
              </h3>
              <Button
                onClick={handleCheckout}
                variant="primary"
                size="large"
                disabled={cartItems.length === 0}
                aria-label="Proceed to checkout"
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default Cart;