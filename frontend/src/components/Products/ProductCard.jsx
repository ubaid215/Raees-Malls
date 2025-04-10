import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../core/Button';
import Card from '../core/Card';
import { useCart } from '../../context/CartContext';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const getImageUrl = () => {
    if (product.images && product.images[0] && typeof product.images[0] === 'string') {
      return product.images[0];
    }
    return '/placeholder-product.png';
  };

  const getPriceDisplay = () => {
    if (!product.variants || product.variants.length === 0) {
      return `PKR - ${Number(product.price || 0).toFixed(0)}`;
    }
    if (product.variants.length > 1) {
      const minPrice = Math.min(...product.variants.map(v => Number(v.price || 0)));
      return `From PKR - ${minPrice.toFixed(0)}`;
    }
    return `PKR - ${Number(product.variants[0]?.price || product.price || 0).toFixed(0)}`;
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(product);
  };

  return (
    <Card className="group hover:shadow-md transition-shadow h-full flex flex-col">
      {/* Discount Badge */}
      {product.discountPercentage > 0 && (
        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
          Up to {Math.round(product.discountPercentage)}% off
        </div>
      )}

      {/* Product Image */}
      <Link to={`/products/${product.id}`} className="block">
        <div className="aspect-square bg-gray-100 overflow-hidden rounded-t-lg">
          <img
            src={getImageUrl()}
            alt={product.title || 'Product image'}
            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
            onError={(e) => (e.target.src = '/placeholder-product.png')}
          />
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex-grow">
          <Link to={`/products/${product.id}`} className="block">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-red-600 transition-colors line-clamp-2">
              {product.title || 'Untitled Product'}
            </h3>
            {product.specs && (
              <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                {product.specs}
              </p>
            )}
          </Link>

          {/* Rating */}
          <div className="flex items-center mb-2">
            <div className="flex text-yellow-400">
              {'★★★★★'.slice(0, Math.floor(product.rating || 0))}
              {'☆'.repeat(5 - Math.floor(product.rating || 0))}
            </div>
            <span className="text-xs text-gray-500 ml-1">
              {product.rating?.toFixed(1)} ({product.numReviews?.toLocaleString() || 0})
            </span>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {product.tags.map((tag, index) => (
                <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price & Button */}
        <div className="mt-auto">
          <p className="text-xl font-bold text-gray-900 mb-3">
            {getPriceDisplay()}
          </p>
          <Button
            variant="primary"
            size="small"
            className="w-full"
            onClick={handleAddToCart}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;