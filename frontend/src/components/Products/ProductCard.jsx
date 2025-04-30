import React, { memo, useState } from 'react';
import { CiShoppingCart } from 'react-icons/ci';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import Button from '../core/Button';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext'; 
import { useAuth } from '../../context/AuthContext';
import PropTypes from 'prop-types';

const ProductCard = memo(({ product }) => {
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const { user } = useAuth();
  const [addingToCart, setAddingToCart] = useState(false);

  if (!product || !product._id || !product.title || !product.images?.length) {
    console.warn('Invalid product data:', product);
    return null;
  }

  const handleCardClick = (e) => {
    const isCartButtonClick = e.target.closest('button');
    if (!isCartButtonClick) {
      navigate(`/product/${product._id}`);
    }
  };

  const handleAddToCartClick = async (e) => {
    e.stopPropagation();
    
    try {
      setAddingToCart(true);
      await addItemToCart(product._id);
      // If we get here, the user was authenticated and the item was added
    } catch (err) {
      // Error already handled in CartContext
      console.error('Error adding item to cart:', err);
    } finally {
      setAddingToCart(false);
    }
  };

  const formattedPrice = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(product.price);

  const handleImageError = (e) => {
    e.target.src = '/placeholder-product.png';
  };

  const categoryNames = product.categories?.map((cat) => cat.name).join(', ') || 'No categories';

  const renderStars = (rating = 0) => {
    const stars = [];
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < full) stars.push(<FaStar key={i} className="text-yellow-500" />);
      else if (i === full && half) stars.push(<FaStarHalfAlt key={i} className="text-yellow-500" />);
      else stars.push(<FaRegStar key={i} className="text-yellow-400" />);
    }
    return stars;
  };

  const buttonLabel = addingToCart ? 'Adding...' : 'Add to Cart';

  return (
    <div
      className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(e)}
    >
      <div className="relative">
        <img
          src={product.images[0]?.url || '/placeholder-product.png'}
          alt={product.title}
          className="w-full h-56 object-cover"
          loading="lazy"
          onError={handleImageError}
        />
        <span className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-2 text-center">
        <h2 className="text-lg font-semibold text-gray-800 hover:text-red-600 line-clamp-2">{product.title}</h2>
        <p className="text-sm text-gray-500">SKU: <span className="text-gray-700">{product.sku || 'N/A'}</span></p>
        <p className="text-sm text-gray-500 truncate">Categories: <span className="text-gray-700">{categoryNames}</span></p>
        <p className="text-xl font-bold text-gray-900">{formattedPrice}</p>

        <div className="flex justify-center items-center gap-1 text-sm">
          {renderStars(product.rating)}
          {product.numReviews && <span className="text-gray-500 ml-1">({product.numReviews})</span>}
        </div>

        <Button
          onClick={handleAddToCartClick}
          className={`mt-3 w-full ${addingToCart ? 'bg-gray-500' : 'bg-red-600 hover:bg-red-700'} text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm sm:text-base`}
          aria-label={`Add ${product.title} to cart`}
          disabled={product.stock === 0 || addingToCart}
        >
          <CiShoppingCart size={20} />
          <span>{buttonLabel}</span>
        </Button>
      </div>
    </div>
  );
});

ProductCard.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    images: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string.isRequired,
      })
    ).isRequired,
    rating: PropTypes.number,
    numReviews: PropTypes.number,
    stock: PropTypes.number,
    sku: PropTypes.string,
    categories: PropTypes.arrayOf(
      PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string,
      })
    ),
  }).isRequired,
};

export default ProductCard;