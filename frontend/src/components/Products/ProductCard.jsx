import React, { memo } from 'react';
import { CiShoppingCart } from 'react-icons/ci';
import Button from '../core/Button';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext'; // Changed to useCart
import PropTypes from 'prop-types';

const ProductCard = memo(({ product }) => {
  const navigate = useNavigate();
  const { addItemToCart } = useCart(); // Changed to useCart functions

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

  const handleAddToCartClick = (e) => {
    e.stopPropagation();
    addItemToCart(product._id); // Updated to match CartContext API
  };

  // Format price with PKR
  const formattedPrice = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(product.price);

  // Handle image error
  const handleImageError = (e) => {
    e.target.src = '/placeholder-product.png';
  };

  // Get category names
  const categoryNames = product.categories?.map((cat) => cat.name).join(', ') || 'No categories';

  return (
    <div
      className="w-full max-w-[320px] mx-auto bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(e)}
    >
      <div className="relative">
        <img
          src={product.images[0]?.url || '/placeholder-product.png'}
          alt={product.title}
          className="w-full h-40 sm:h-48 lg:h-56 object-cover"
          loading="lazy"
          onError={handleImageError}
        />
        {product.stock > 0 ? (
          <span className="absolute top-2 left-2 bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded">
            In Stock ({product.stock})
          </span>
        ) : (
          <span className="absolute top-2 left-2 bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded">
            Out of Stock
          </span>
        )}
      </div>
      <div className="p-4 sm:p-6 flex flex-col gap-2 text-center">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate hover:text-red-600">
          {product.title}
        </h2>
        <p className="text-sm sm:text-base text-gray-600">SKU: {product.sku || 'N/A'}</p>
        <p className="text-sm sm:text-base text-gray-600 truncate">
          Categories: {categoryNames}
        </p>
        <p className="text-base sm:text-lg font-medium text-gray-900">{formattedPrice}</p>
        <div className="flex justify-center items-center gap-1 text-yellow-500 text-sm sm:text-base">
          {'⭐'.repeat(Math.floor(product.rating || 0))}
          {product.rating % 1 >= 0.5 && '½'}
          {product.numReviews ? ` (${product.numReviews})` : ''}
        </div>
        <Button
          onClick={handleAddToCartClick}
          className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm sm:text-base"
          aria-label={`Add ${product.title} to cart`}
          disabled={product.stock === 0}
        >
          <CiShoppingCart size={20} />
          <span>Add to Cart</span>
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