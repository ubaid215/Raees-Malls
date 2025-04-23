import React from 'react';
import { CiHeart, CiShoppingCart, CiTrash } from 'react-icons/ci';
import { DotIcon } from 'lucide-react';
import { useCartWishlist } from '../../context/CartWishlistContext';
import Button from '../core/Button';

function WishlistProductCard({ productId, image, title, price, rating, reviews, stock }) {
  const { addToCart, removeFromWishlist } = useCartWishlist();

  const handleAddToCart = () => {
    addToCart({ productId, image, title, price, rating, reviews, stock });
  };

  const handleRemove = () => {
    removeFromWishlist(productId);
  };

  return (
    <div className="w-full max-w-sm flex flex-col items-center overflow-hidden hover:shadow-xl bg-white rounded-xl shadow-lg">
      <div className="relative overflow-hidden group">
        <img
          src={image}
          alt={title}
          className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
          onError={(e) => (e.currentTarget.src = '/placeholder-product.png')}
        />
        <CiHeart
          className="absolute top-4 right-4 fill-red-500 text-red-500 opacity-100 transition-opacity duration-300"
          size={24}
          strokeWidth={1}
        />
        <Button
          onClick={handleAddToCart}
          variant="primary"
          size="medium"
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[90%] opacity-0 group-hover:opacity-100 group-hover:translate-y-[-10px] transition-all duration-300"
          disabled={stock === 0}
          aria-label={`Add ${title} to cart`}
        >
          <CiShoppingCart size={20} strokeWidth={1} />
          <span className="text-base whitespace-nowrap">Add to cart</span>
        </Button>
      </div>
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-black cursor-pointer hover:text-red-500">
          {title}
        </h2>
        <p className="text-lg">{price} PKR</p>
        <p className="text-base">{'⭐'.repeat(rating)} ({reviews})</p>
        <p className="flex items-center justify-center gap-2 text-green-500 text-base">
          <DotIcon size={40} /> {stock} in Stock
        </p>
        <Button
          onClick={handleRemove}
          variant="secondary"
          size="medium"
          className="mt-4 w-full"
          aria-label={`Remove ${title} from wishlist`}
        >
          <CiTrash size={20} strokeWidth={1} />
          <span className="text-base">Remove</span>
        </Button>
      </div>
    </div>
  );
}

function Wishlist() {
  const { wishlistItems } = useCartWishlist();

  return (
    <div className="w-full h-auto py-8 bg-gray-50">
      <h1 className="text-center lg:text-4xl text-2xl font-bold text-gray-800 pb-6">
        Your Wishlist
      </h1>
      <section className="w-full max-w-7xl mx-auto px-4 lg:px-8">
        {wishlistItems.length === 0 ? (
          <p className="text-center text-gray-500 text-lg">
            Your wishlist is empty.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((product) => (
              <WishlistProductCard
                key={product.productId}
                productId={product.productId}
                image={product.image}
                title={product.title}
                price={product.price}
                rating={product.rating}
                reviews={product.reviews}
                stock={product.stock}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Wishlist;