import React, { useState, useEffect, memo, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { useCartWishlist } from '../context/CartWishlistContext';
import LoadingSkeleton from '../shared/LoadingSkelaton';
import { productService } from '../../services/productAPI';
import { addToCart } from '../../services/api';
import Button from '../core/Button';

const BASE_URL = 'http://localhost:5000';

// Helper function to construct image URLs
const getImageUrl = (image) => {
  const url = image?.url || image;
  return url?.startsWith('http') ? url : `${BASE_URL}${url || '/placeholder-product.png'}`;
};

// Memoized ProductDetails component
const ProductDetails = memo(({ productData }) => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { addToCart: addToCartContext } = useCartWishlist();
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
        let fetchedProduct;
        if (productData) {
          fetchedProduct = productData;
        } else if (productId) {
          const response = await productService.getPublicProductById(productId);
          if (!response.success) {
            throw new Error(response.message || 'Product not found');
          }
          fetchedProduct = response.data;
        }
        if (!fetchedProduct) {
          throw new Error('Product not found');
        }
        setProduct(fetchedProduct);
        setActiveImage(getImageUrl(fetchedProduct.images?.[0]));
        setSelectedColor(fetchedProduct.colors?.[0] || '');
      } catch (err) {
        setError(err.message || 'Failed to load product details');
        toast.error(err.message || 'Failed to load product details');
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

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Please log in to add items to cart');
      navigate('/login');
      return;
    }
    if (!product || product.stock <= 0) return;

    try {
      await addToCart({ productId: product._id, quantity });
      addToCartContext({ _id: product._id, title: product.title, price: product.price, quantity });
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  const handleOrderNow = () => {
    if (!user) {
      toast.error('Please log in to place an order');
      navigate('/login');
      return;
    }
    if (!product || product.stock <= 0) return;

    addToCartContext({ _id: product._id, title: product.title, price: product.price, quantity });
    navigate('/checkout');
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setProduct(null);
  };

  if (isLoading) {
    return (
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto animate-pulse">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/2">
              <div className="h-48 sm:h-56 lg:h-64 bg-gray-200 rounded-lg mb-4"></div>
              <div className="flex gap-2">
                {Array(4).fill().map((_, i) => (
                  <div key={i} className="w-16 h-16 bg-gray-200 rounded-md"></div>
                ))}
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="py-12 px-4 text-center">
        <div className="max-w-7xl mx-auto">
          <p className="text-red-600 mb-4">{error || 'Product not found'}</p>
          <Button
            onClick={handleRetry}
            className="border border-red-600 text-red-600 hover:bg-red-50"
          >
            Retry
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Images section */}
          <div className="w-full md:w-1/2 flex flex-col md:flex-row gap-4">
            {/* Thumbnail images */}
            <div className="flex md:flex-col gap-2 order-2 md:order-1">
              {product.images?.map((img, index) => (
                <div
                  key={index}
                  className={`w-16 h-16 border-2 rounded-md cursor-pointer transition-all ${
                    activeImage === getImageUrl(img) ? 'border-red-600' : 'border-transparent'
                  }`}
                  onClick={() => setActiveImage(getImageUrl(img))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveImage(getImageUrl(img))}
                  aria-label={`View image ${index + 1}`}
                >
                  <img
                    src={getImageUrl(img)}
                    alt={`${product.title} - View ${index + 1}`}
                    className="w-full h-full object-cover rounded-md"
                    loading="lazy"
                    onError={(e) => (e.target.src = '/placeholder-product.png')}
                  />
                </div>
              ))}
            </div>

            {/* Main image */}
            <div className="flex-1 bg-gray-50 rounded-lg p-4 flex items-center justify-center order-1 md:order-2">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.title}
                  className="w-full h-40 sm:h-48 lg:h-56 object-cover rounded-lg"
                  loading="lazy"
                  onError={(e) => (e.target.src = '/placeholder-product.png')}
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {product.title}
            </h1>

            {/* Rating */}
            <div className="flex items-center mb-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${i < Math.round(product.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-gray-600 ml-2 text-sm sm:text-base">
                {product.numReviews || 0} reviews
              </span>
            </div>

            {/* Price */}
            <p className="text-2xl font-semibold text-gray-900 mb-4">
              {product.price} PKR
            </p>

            {/* Stock */}
            <p className={`text-sm sm:text-base mb-6 ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </p>

            {/* Colors */}
            {product.colors?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">Color</h3>
                <div className="flex gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
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
              <div className="mb-6">
                <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-2">Quantity</h4>
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
                  <div className="w-12 h-10 border-t border-b border-gray-300 flex items-center justify-center text-sm sm:text-base">
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
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Button
                onClick={handleAddToCart}
                className={`flex-1 py-3 px-6 rounded-md transition-colors text-sm sm:text-base ${
                  product.stock > 0
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={product.stock <= 0}
                aria-label="Add to cart"
              >
                Add to Cart
              </Button>
              <Button
                onClick={handleOrderNow}
                className={`flex-1 py-3 px-6 rounded-md transition-colors text-sm sm:text-base ${
                  product.stock > 0
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
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
              <p className="text-gray-600 text-sm sm:text-base">
                {product.description || 'No description available'}
              </p>
            </div>

            {/* Categories */}
            {product.categories?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {product.categories.map((category) => (
                    <span
                      key={category._id}
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

// PropTypes for validation
ProductDetails.propTypes = {
  productData: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    price: PropTypes.number,
    images: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({ url: PropTypes.string }),
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
  }),
};

export default ProductDetails;