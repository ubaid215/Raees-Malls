import React, { memo } from 'react';
import { CiHeart, CiShoppingCart } from 'react-icons/ci';
import { DotIcon } from 'lucide-react';
import Button from '../core/Button';
import { useNavigate } from 'react-router-dom';
import { useCartWishlist } from '../../context/CartWishlistContext';
import PropTypes from 'prop-types';

const ProductCard = memo(({ product }) => {
  const navigate = useNavigate();
  const { addToCart, addToWishlist } = useCartWishlist();

  if (!product || !product.productId || !product.title || !product.images?.length) {
    console.warn('Invalid product data:', product);
    return null;
  }

  const handleCardClick = (e) => {
    const isHeartClick = e.target.closest('svg[data-heart="true"]');
    const isCartButtonClick = e.target.closest('button');
    if (!isHeartClick && !isCartButtonClick) {
      navigate(`/product/${product.productId}`);
    }
  };

  const handleHeartClick = (e) => {
    e.stopPropagation();
    addToWishlist(product);
  };

  const handleAddToCartClick = (e) => {
    e.stopPropagation();
    addToCart(product);
  };

  // Format price with commas
  const formattedPrice = new Intl.NumberFormat('en-PK').format(product.price);
  
  // Handle image error
  const handleImageError = (e) => {
    e.target.src = '/path-to-fallback-image.jpg';
  };

  return (
    <div
      className="w-64 h-auto flex flex-col items-center overflow-hidden hover:shadow-xl bg-white rounded-xl shadow-lg cursor-pointer"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(e)}
    >
      <div className="relative overflow-hidden group">
        <img
          src={product.images[0]}
          alt={product.title}
          className="w-full h-auto"
          loading="lazy"
          onError={handleImageError}
        />
        <CiHeart
          data-heart="true"
          onClick={handleHeartClick}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
          size={24}
          strokeWidth={1}
          aria-label="Add to wishlist"
        />
        <Button
          onClick={handleAddToCartClick}
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[90%] opacity-0 group-hover:opacity-100 group-hover:translate-y-[-10px] transition-all duration-300 flex items-center justify-center gap-3 bg-red-500 text-white px-6 py-3 rounded-lg"
          aria-label={`Add ${product.title} to cart`}
        >
          <CiShoppingCart size={20} strokeWidth={1} />
          <span className="text-base whitespace-nowrap">Add to cart</span>
        </Button>
      </div>
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-black hover:text-red-500">
          {product.title}
        </h2>
        <p className="text-lg">{formattedPrice} PKR</p>
        <p className="text-base">
          {'⭐'.repeat(Math.floor(product.rating || 0))}
          {product.rating % 1 >= 0.5 && '½'}
          {product.numReviews ? ` (${product.numReviews})` : ''}
        </p>
        {product.stock > 0 && (
          <p className="flex items-center justify-center gap-2 text-green-500 text-base">
            <DotIcon size={40} aria-label="In stock" /> 
            {product.stock} in Stock
          </p>
        )}
      </div>
    </div>
  );
});

ProductCard.propTypes = {
  product: PropTypes.shape({
    productId: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    images: PropTypes.arrayOf(PropTypes.string).isRequired,
    rating: PropTypes.number,
    numReviews: PropTypes.number,
    stock: PropTypes.number
  }).isRequired
};

export default ProductCard;