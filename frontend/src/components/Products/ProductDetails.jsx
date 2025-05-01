import React, { useState, useEffect, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { getProductById } from '../../services/productService';
import { useCart } from '../../context/CartContext';
import Button from '../core/Button';
import LoadingSpinner from '../core/LoadingSpinner';

const ProductDetails = memo(() => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addItemToCart, isLoading: cartLoading } = useCart();
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
        const fetchedProduct = await getProductById(productId, { isPublic: true });
        
        if (!fetchedProduct) {
          throw new Error('Product not found');
        }

        // Process images to ensure proper URLs
        const processedImages = (fetchedProduct.images || []).map(img => {
          let url = typeof img === 'string' ? img : img?.url;
          if (url && !url.startsWith('http')) {
            url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${url}`;
          }
          return {
            url: url || '/images/placeholder-product.png',
            alt: img?.alt || fetchedProduct.title || 'Product image'
          };
        });

        setProduct({
          ...fetchedProduct,
          images: processedImages.length ? processedImages : [{
            url: '/images/placeholder-product.png',
            alt: 'Placeholder product image'
          }]
        });

        setActiveImage(processedImages[0]?.url || '/images/placeholder-product.png');
        setSelectedColor(fetchedProduct.colors?.[0] || '');
      } catch (err) {
        setError(err.message || 'Failed to load product details');
        toast.error(err.message || 'Failed to load product details');
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchProductData();
    } else {
      setError('No product ID provided');
      setIsLoading(false);
    }
  }, [productId]);

  const handleQuantityChange = (value) => {
    if (!product) return;
    const newQuantity = quantity + value;
    if (newQuantity > 0 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!product || product.stock <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    try {
      await addItemToCart(product._id, null, quantity);
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  const handleOrderNow = async () => {
    if (!product || product.stock <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    try {
      await addItemToCart(product._id, null, quantity);
      navigate('/checkout');
    } catch (err) {
      toast.error(err.message || 'Failed to proceed to checkout');
    }
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setProduct(null);
  };

  if (isLoading) {
    return (
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="py-8 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-7xl mx-auto">
          <p className="text-red-600 mb-4 text-sm sm:text-base">{error || 'Product not found'}</p>
          <Button
            onClick={handleRetry}
            className="border border-red-600 text-red-600 hover:bg-red-50 px-4 py-2 rounded-md text-sm sm:text-base"
          >
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const renderStars = (rating = 0) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <svg
            key={i}
            className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <svg
            key={i}
            className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <defs>
              <linearGradient id="half-star" x1="0" x2="100%" y1="0" y2="0">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#D1D5DB" />
              </linearGradient>
            </defs>
            <path
              fill="url(#half-star)"
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        );
      } else {
        stars.push(
          <svg
            key={i}
            className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      }
    }
    return stars;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          {/* Images section */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            {/* Main image */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center h-96">
              <img
                src={activeImage}
                alt={product.title}
                className="w-full h-full object-contain rounded-lg"
                loading="lazy"
                onError={(e) => {
                  e.target.src = '/images/placeholder-product.png';
                }}
              />
            </div>

            {/* Thumbnail images */}
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all ${
                      activeImage === img.url ? 'border-red-600' : 'border-gray-200'
                    }`}
                    onClick={() => setActiveImage(img.url)}
                  >
                    <img
                      src={img.url}
                      alt={`${product.title} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover rounded-md"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = '/images/placeholder-product.png';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product details */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {product.title}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {renderStars(product.rating || 0)}
              </div>
              <span className="text-gray-600 text-sm sm:text-base">
                {product.numReviews || 0} reviews
              </span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3">
              {product.discountPrice && product.discountPrice < product.price ? (
                <>
                  <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                    {formatPrice(product.discountPrice)}
                  </p>
                  <p className="text-base text-gray-500 line-through">
                    {formatPrice(product.price)}
                  </p>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">
                    {Math.round(
                      ((product.price - product.discountPrice) / product.price * 100)
                    )}
                    % OFF
                  </span>
                </>
              ) : (
                <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                  {formatPrice(product.price)}
                </p>
              )}
            </div>

            {/* Stock */}
            <p
              className={`text-sm sm:text-base ${
                product.stock > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </p>

            {/* Colors */}
            {product.colors?.length > 0 && (
              <div>
                <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">
                  Color
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-red-600 ${
                        selectedColor === color ? 'border-red-600' : 'border-gray-200'
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
              <div>
                <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-2">
                  Quantity
                </h4>
                <div className="flex items-center w-fit">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className={`w-10 h-10 border border-gray-300 rounded-l-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-600 ${
                      quantity <= 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <div className="w-12 h-10 border-t border-b border-gray-300 flex items-center justify-center text-sm sm:text-base">
                    {quantity}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock}
                    className={`w-10 h-10 border border-gray-300 rounded-r-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-600 ${
                      quantity >= product.stock
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                onClick={handleAddToCart}
                className={`flex-1 py-3 px-4 rounded-md text-sm sm:text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 ${
                  product.stock > 0 && !cartLoading
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={product.stock <= 0 || cartLoading}
                aria-label="Add to cart"
              >
                {cartLoading ? 'Adding...' : 'Add to Cart'}
              </Button>
              <Button
                onClick={handleOrderNow}
                className={`flex-1 py-3 px-4 rounded-md text-sm sm:text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 ${
                  product.stock > 0 && !cartLoading
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={product.stock <= 0 || cartLoading}
                aria-label="Order now"
              >
                {cartLoading ? 'Processing...' : 'Order Now'}
              </Button>
            </div>

            {/* Description */}
            <div className="mt-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Description
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                {product.description || 'No description available'}
              </p>
            </div>

            {/* Categories */}
            {product.categories?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">
                  Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.categories.map((category) => (
                    <span
                      key={category._id || category.name}
                      className="inline-block bg-gray-100 text-gray-600 text-xs sm:text-sm px-3 py-1 rounded-full"
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

ProductDetails.propTypes = {
  _id: PropTypes.string,
  title: PropTypes.string,
  price: PropTypes.number,
  discountPrice: PropTypes.number,
  images: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        url: PropTypes.string,
        alt: PropTypes.string,
      }),
    ])
  ),
  sku: PropTypes.string,
  stock: PropTypes.number,
  rating: PropTypes.number,
  numReviews: PropTypes.number,
  description: PropTypes.string,
  colors: PropTypes.arrayOf(PropTypes.string),
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      name: PropTypes.string,
    })
  ),
};

export default ProductDetails;