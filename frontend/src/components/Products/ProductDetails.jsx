import React, { useState, useEffect, memo } from 'react';
import { useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import LoadingSkeleton from '../shared/LoadingSkelaton'; 
import { getProductById } from '../../services/productAPI';
import Button from '../core/Button';

// Helper function to construct image URLs
const getImageUrl = (imagePath) => {
  return imagePath
    ? `http://localhost:5000${imagePath}`
    : '/placeholder-product.png';
};

// Memoized ProductDetails component
const ProductDetails = memo(({ productData }) => {
  const { productId } = useParams();
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState('');
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProductData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (productData) {
          setProduct(productData);
          setActiveImage(getImageUrl(productData.images?.[0]));
          setSelectedColor(productData.colors?.[0] || '');
        } else if (productId) {
          const fetchedProduct = await getProductById(productId);
          if (!fetchedProduct) {
            throw new Error('Product not found');
          }
          setProduct(fetchedProduct);
          setActiveImage(getImageUrl(fetchedProduct.images?.[0]));
          setSelectedColor(fetchedProduct.colors?.[0] || '');
        }
      } catch (err) {
        setError(err.message || 'Failed to load product details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, [productId, productData]);

  const handleQuantityChange = (value) => {
    if (!product) return;
    const newQuantity = quantity + value;
    if (newQuantity > 0 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    // Trigger re-fetch by resetting product and re-running useEffect
    setProduct(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSkeleton
          type="card"
          width="100%"
          height="400px"
          count={1}
          className="rounded-lg"
        />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Product not found'}</p>
          <Button
            onClick={handleRetry}
            variant="outline"
            className="text-indigo-600 border-indigo-600 hover:bg-indigo-50"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Images section */}
        <div className="w-full md:w-1/2 flex flex-col md:flex-row gap-4">
          {/* Thumbnail images */}
          <div className="flex md:flex-col gap-2 order-2 md:order-1">
            {product.images?.map((img, index) => (
              <div
                key={index}
                className={`w-16 h-16 border-2 rounded-md cursor-pointer transition-all ${
                  activeImage === getImageUrl(img) ? 'border-blue-500' : 'border-transparent'
                }`}
                onClick={() => setActiveImage(getImageUrl(img))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveImage(getImageUrl(img))}
                aria-label={`View image ${index + 1}`}
              >
                <img
                  src={getImageUrl(img)}
                  alt={`${product.title || product.name} - View ${index + 1}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {/* Main image */}
          <div className="flex-1 bg-gray-50 rounded-lg p-4 flex items-center justify-center order-1 md:order-2">
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.title || product.name}
                className="max-h-96 object-contain"
                loading="lazy"
              />
            ) : (
              <div className="text-gray-400 flex items-center justify-center h-full">
                No image available
              </div>
            )}
          </div>
        </div>

        {/* Product details */}
        <div className="w-full md:w-1/2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {product.title || product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center mb-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-5 h-5 ${i < Math.round(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-gray-600 ml-2">
              {product.numReviews || product.reviews || 0} reviews
            </span>
          </div>

          {/* Price */}
          <p className="text-2xl font-semibold text-gray-900 mb-4">
            {product.price} {product.currency || 'PKR'}
          </p>

          {/* Stock */}
          <p className={`text-sm mb-6 ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </p>

          {/* Colors */}
          {product.colors?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Color</h3>
              <div className="flex gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColor === color ? 'border-blue-500' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select ${color}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          {product.stock > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Quantity</h4>
              <div className="flex items-center">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className={`w-10 h-10 border border-gray-300 rounded-l-md flex items-center justify-center ${
                    quantity <= 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <div className="w-12 h-10 border-t border-b border-gray-300 flex items-center justify-center">
                  {quantity}
                </div>
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= product.stock}
                  className={`w-10 h-10 border border-gray-300 rounded-r-md flex items-center justify-center ${
                    quantity >= product.stock ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mb-8">
            <Button
              className={`flex-1 py-3 px-6 rounded-md transition-colors ${
                product.stock > 0
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={product.stock <= 0}
              aria-label="Add to cart"
            >
              Add to Cart
            </Button>
            <Button
              className={`flex-1 py-3 px-6 rounded-md transition-colors ${
                product.stock > 0
                  ? 'bg-gray-900 text-white hover:bg-gray-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={product.stock <= 0}
              aria-label="Order now"
            >
              Order Now
            </Button>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600">{product.description || 'No description available'}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

// PropTypes for validation
ProductDetails.propTypes = {
  productData: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    name: PropTypes.string,
    price: PropTypes.number,
    currency: PropTypes.string,
    stock: PropTypes.number,
    rating: PropTypes.number,
    numReviews: PropTypes.number,
    reviews: PropTypes.number,
    description: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
    colors: PropTypes.arrayOf(PropTypes.string),
  }),
};

export default ProductDetails;