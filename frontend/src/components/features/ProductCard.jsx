import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../core/Button';
import Card from '../core/Card';

const ProductCard = ({ product, buttonBelowPrice = false }) => {
  const getImageUrl = () => {
    if (product.images && product.images[0] && typeof product.images[0] === 'string') {
      return product.images[0];
    }
    return '/placeholder-product.png';
  };

  const getVariantDisplay = () => {
    if (!product.variants || product.variants.length === 0) {
      return 'No variants';
    }
    if (product.variants.length > 1) {
      return `${product.variants.length} variants`;
    }
    return product.variants[0]?.name || 'Default';
  };

  const getPriceDisplay = () => {
    if (!product.variants || product.variants.length === 0) {
      return `PKR ${Number(product.price || 0).toFixed(2)}`;
    }
    if (product.variants.length > 1) {
      const minPrice = Math.min(...product.variants.map(v => Number(v.price || 0)));
      return `From PKR ${minPrice.toFixed(2)}`;
    }
    return `PKR ${Number(product.variants[0]?.price || product.price || 0).toFixed(2)}`;
  };

  return (
    <Card className="group hover:shadow-md transition-shadow h-full flex flex-col">
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
            <h3 className="text-lg font-medium text-gray-900 mb-1 hover:text-red-600 transition-colors line-clamp-2">
              {product.title || 'Untitled Product'}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {product.description || 'No description available'}
            </p>
          </Link>

          {/* Variants */}
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <span>{getVariantDisplay()}</span>
          </div>
        </div>

        {/* Price & Button */}
        {buttonBelowPrice ? (
          <div className="mt-auto">
            <p className="text-lg font-medium text-gray-900 mb-3">
              {getPriceDisplay()}
            </p>
            <Button
              variant="primary"
              size="small"
              className="w-full"
              onClick={(e) => {
                e.preventDefault();
                console.log(`Added ${product.title} to cart`);
              }}
            >
              Add to Cart
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between mt-auto">
            <p className="text-lg font-medium text-gray-900">
              {getPriceDisplay()}
            </p>
            <Button
              variant="primary"
              size="small"
              onClick={(e) => {
                e.preventDefault();
                console.log(`Added ${product.title} to cart`);
              }}
            >
              Add to Cart
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProductCard;