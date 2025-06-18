import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CiHeart, CiShoppingCart, CiTrash } from 'react-icons/ci';
import { DotIcon, Star } from 'lucide-react';
import { WishlistContext } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import Button from '../core/Button';

function WishlistProductCard({ 
  productId, 
  image, 
  title, 
  price = 0, 
  discountPrice = null, 
  rating = 0, 
  reviews = 0, 
  stock = 0 
}) {
  const { removeItemFromWishlist, loading } = useContext(WishlistContext);
  const { addItemToCart } = useCart();
  const navigate = useNavigate();

  // Safe number formatting with proper null/undefined checks
  const safeRating = rating != null ? Number(rating) : 0;
  const safeReviews = reviews != null ? Number(reviews) : 0;
  const safePrice = price != null ? Number(price) : 0;
  const safeDiscountPrice = discountPrice != null ? Number(discountPrice) : null;
  const safeStock = stock != null ? Number(stock) : 0;

  // Additional validation to ensure numbers are valid
  const validRating = isNaN(safeRating) ? 0 : safeRating;
  const validReviews = isNaN(safeReviews) ? 0 : safeReviews;
  const validPrice = isNaN(safePrice) ? 0 : safePrice;
  const validDiscountPrice = safeDiscountPrice != null && !isNaN(safeDiscountPrice) ? safeDiscountPrice : null;
  const validStock = isNaN(safeStock) ? 0 : safeStock;

  // Check if there's a valid discount
  const hasDiscount = validDiscountPrice && validDiscountPrice < validPrice;
  const discountPercentage = hasDiscount ? Math.round(((validPrice - validDiscountPrice) / validPrice) * 100) : 0;

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addItemToCart(productId, null, 1);
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    try {
      await removeItemFromWishlist(productId);
    } catch (err) {
      console.error('Error removing item from wishlist:', err);
    }
  };

  const handleCardClick = () => {
    navigate(`/product/${productId}`);
  };

  // Generate star rating display
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(validRating);
    const hasHalfStar = validRating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" size={16} className="fill-yellow-400 text-yellow-400 opacity-50" />);
    }
    
    const remainingStars = 5 - Math.ceil(validRating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} size={16} className="text-gray-300" />);
    }
    
    return stars;
  };

  const formatPrice = (amount) => {
    const validAmount = amount != null && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(validAmount);
  };

  return (
    <>
      <style>{`
        @keyframes pulse-discount {
          0%, 100% { transform: scale(1) rotate(12deg); }
          50% { transform: scale(1.05) rotate(12deg); }
        }
        .discount-badge {
          animation: pulse-discount 2s infinite;
        }
        .discount-badge:hover {
          animation: none;
          transform: rotate(0deg) scale(1.1);
        }
      `}</style>
      <div 
        className="group relative w-full max-w-sm mx-auto bg-white rounded-3xl shadow-xs hover:shadow-lg transition-all duration-500 overflow-hidden border border-gray-100 hover:border-red-200 transform hover:-translate-y-2 cursor-pointer"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-label={`View details for ${title || 'Product'}`}
      >
        {/* Image Container */}
        <div className="relative overflow-hidden bg-gray-50">
          <img
            src={image || '/placeholder-product.png'}
            alt={title || 'Product'}
            className="w-full h-56 sm:h-64 md:h-56 lg:h-64 object-cover transition-all duration-500 group-hover:scale-110"
            loading="lazy"
            onError={(e) => (e.currentTarget.src = '/placeholder-product.png')}
          />
          
          {/* Gradient overlay for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Discount Badge */}
          {hasDiscount && (
            <div className="absolute top-4 left-4 z-10">
              <span className="discount-badge bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                {discountPercentage}% OFF
              </span>
            </div>
          )}

          {/* Stock Badge */}
          <div className={`absolute top-4 ${hasDiscount ? 'left-4 mt-10' : 'left-4'}`}>
            {validStock > 0 ? (
              <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                In Stock
              </span>
            ) : (
              <span className="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                Out of Stock
              </span>
            )}
          </div>
          
          {/* Heart Icon */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
            <CiHeart
              className="fill-red-500 text-red-500 drop-shadow-sm"
              size={22}
              strokeWidth={1.5}
              aria-label="Wishlist item"
            />
          </div>

          {/* Quick Add to Cart Button */}
          <div className="absolute inset-x-4 bottom-4">
            <Button
              onClick={handleAddToCart}
              variant="primary"
              size="medium"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg backdrop-blur-sm border-0 text-sm sm:text-base"
              disabled={validStock === 0 || loading}
              isLoading={loading}
              aria-label={`Add ${title || 'product'} to cart`}
            >
              <CiShoppingCart size={20} strokeWidth={1.5} className="mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Title */}
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-2 leading-tight hover:text-red-600 transition-colors duration-200 min-h-[3.5rem] flex items-center">
            {title || 'Untitled Product'}
          </h2>

          {/* Price */}
          <div className="flex items-center justify-between">
            {hasDiscount ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-xl sm:text-2xl font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg">
                    {formatPrice(validDiscountPrice)}
                  </p>
                  <span className="inline-flex px-2 py-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold shadow-lg transform hover:scale-105 transition-transform duration-200">
                    {discountPercentage}% OFF
                  </span>
                </div>
                <p className="text-sm text-gray-500 line-through font-medium">
                  {formatPrice(validPrice)}
                </p>
              </div>
            ) : (
              <p className="text-xl sm:text-2xl font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg">
                {formatPrice(validPrice)}
              </p>
            )}
          </div>

          {/* Rating and Reviews */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
            <div className="flex items-center space-x-1">
              {renderStars()}
            </div>
            <span className="text-sm text-gray-600 font-medium">
              {validRating.toFixed(1)} ({validReviews} review{validReviews !== 1 ? 's' : ''})
            </span>
          </div>

          {/* Stock Information */}
          <div className={`flex items-center justify-center p-2 rounded-lg ${validStock > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <DotIcon size={20} className={validStock > 0 ? 'text-green-600' : 'text-red-600'} />
            <span className={`text-sm font-medium ${validStock > 0 ? 'text-green-700' : 'text-red-700'}`}>
              {validStock > 0 ? `${validStock} Available` : 'Currently Unavailable'}
            </span>
          </div>

          {/* Remove Button */}
          <Button
            onClick={handleRemove}
            variant="outline"
            size="medium"
            className="w-full border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-700 hover:text-red-600 font-medium py-3 rounded-xl transition-all duration-200 text-sm sm:text-base"
            disabled={loading}
            isLoading={loading}
            aria-label={`Remove ${title || 'product'} from wishlist`}
          >
            <CiTrash size={20} strokeWidth={1.5} className="mr-2" />
            Remove Wishlist
          </Button>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-3xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        )}
      </div>
    </>
  );
}

export default WishlistProductCard;