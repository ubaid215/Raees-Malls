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
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeMedia, setActiveMedia] = useState({ type: 'image', url: '' });
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

        // Process images and videos
        const processMedia = (items) => (items || []).map(item => {
          let url = typeof item === 'string' ? item : item?.url;
          if (url && !url.startsWith('http')) {
            url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${url}`;
          }
          return {
            url: url || '/images/placeholder-product.png',
            alt: item?.alt || fetchedProduct.title || 'Product media',
            public_id: item?.public_id
          };
        });

        const processedProduct = {
          ...fetchedProduct,
          images: processMedia(fetchedProduct.images),
          videos: processMedia(fetchedProduct.videos),
          variants: (fetchedProduct.variants || []).map(variant => ({
            ...variant,
            images: processMedia(variant.images),
            videos: processMedia(variant.videos),
            price: parseFloat(variant.price) || 0,
            discountPrice: variant.discountPrice ? parseFloat(variant.discountPrice) : undefined,
            stock: parseInt(variant.stock) || 0
          })),
          price: parseFloat(fetchedProduct.price) || 0,
          discountPrice: fetchedProduct.discountPrice ? parseFloat(fetchedProduct.discountPrice) : undefined,
          stock: parseInt(fetchedProduct.stock) || 0,
          specifications: fetchedProduct.specifications || []
        };

        setProduct(processedProduct);

        // Set initial media (prefer video, then image)
        const initialMedia = processedProduct.videos?.[0]
          ? { type: 'video', url: processedProduct.videos[0].url }
          : processedProduct.images?.[0]
            ? { type: 'image', url: processedProduct.images[0].url }
            : { type: 'image', url: '/images/placeholder-product.png' };
        setActiveMedia(initialMedia);

        // Set default variant (first one, if available)
        setSelectedVariant(processedProduct.variants?.[0] || null);
      } catch (err) {
        console.error('Fetch error:', err);
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

  const handleAddToCart = async () => {
    if (!product || (selectedVariant ? selectedVariant.stock : product.stock) <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    try {
      await addItemToCart(
        product._id,
        selectedVariant?._id || null,
        1 // Fixed quantity of 1
      );
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  const handleOrderNow = async () => {
    if (!product || (selectedVariant ? selectedVariant.stock : product.stock) <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    try {
      await addItemToCart(
        product._id,
        selectedVariant?._id || null,
        1 // Fixed quantity of 1
      );
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

  const handleMediaClick = (media, type = 'image') => {
    setActiveMedia({ type, url: media.url });
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    // Set variant's first video or image as active media
    const media = variant.videos?.[0]
      ? { type: 'video', url: variant.videos[0].url }
      : variant.images?.[0]
        ? { type: 'image', url: variant.images[0].url }
        : product.videos?.[0]
          ? { type: 'video', url: product.videos[0].url }
          : product.images?.[0]
            ? { type: 'image', url: product.images[0].url }
            : { type: 'image', url: '/images/placeholder-product.png' };
    setActiveMedia(media);
  };

  const handleMediaError = (e) => {
    console.warn('Media failed to load:', e.target.src);
    e.target.src = '/images/placeholder-product.png';
    e.target.onerror = null;
    if (e.target.tagName === 'VIDEO') {
      e.target.outerHTML = `<img
        src="/images/placeholder-product.png"
        alt="Placeholder product image"
        class="w-full h-full object-contain rounded-lg"
        loading="lazy"
      />`;
    }
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
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3 .921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784 .57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81 .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      }
    }
    return stars;
  };

  const formatPrice = (price) => {
    if (!Number.isFinite(price)) {
      console.warn('Invalid price:', price);
      return 'Price unavailable';
    }
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Ensure valid price and stock
  const currentPrice = Number.isFinite(selectedVariant?.discountPrice)
    ? selectedVariant.discountPrice
    : Number.isFinite(selectedVariant?.price)
      ? selectedVariant.price
      : Number.isFinite(product.discountPrice)
        ? product.discountPrice
        : product.price || 0;

  const originalPrice = selectedVariant
    ? selectedVariant.price
    : product.price || 0;

  const currentStock = Number.isFinite(selectedVariant?.stock)
    ? selectedVariant.stock
    : product.stock || 0;

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          {/* Media section */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            {/* Main media */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center h-96">
              {activeMedia.type === 'video' ? (
                <video
                  src={activeMedia.url}
                  className="w-full h-full object-contain rounded-lg"
                  muted
                  controls
                  preload="metadata"
                  onError={handleMediaError}
                />
              ) : (
                <img
                  src={activeMedia.url}
                  alt={product.title || 'Product image'}
                  className="w-full h-full object-contain rounded-lg"
                  loading="lazy"
                  onError={handleMediaError}
                />
              )}
            </div>

            {/* Thumbnail media (images and videos) */}
            {(product.images?.length || product.videos?.length || selectedVariant?.images?.length || selectedVariant?.videos?.length) && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images?.map((img, index) => (
                  <button
                    key={`img-${index}`}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all ${
                      activeMedia.url === img.url && activeMedia.type === 'image' ? 'border-red-600' : 'border-gray-200'
                    }`}
                    onClick={() => handleMediaClick(img, 'image')}
                  >
                    <img
                      src={img.url}
                      alt={`${product.title} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover rounded-md"
                      loading="lazy"
                      onError={handleMediaError}
                    />
                  </button>
                ))}
                {product.videos?.map((vid, index) => (
                  <button
                    key={`vid-${index}`}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all relative ${
                      activeMedia.url === vid.url && activeMedia.type === 'video' ? 'border-red-600' : 'border-gray-200'
                    }`}
                    onClick={() => handleMediaClick(vid, 'video')}
                  >
                    <video
                      src={vid.url}
                      className="w-full h-full object-cover rounded-md"
                      muted
                      preload="metadata"
                      onError={handleMediaError}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </button>
                ))}
                {selectedVariant?.images?.map((img, index) => (
                  <button
                    key={`var-img-${index}`}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all ${
                      activeMedia.url === img.url && activeMedia.type === 'image' ? 'border-red-600' : 'border-gray-200'
                    }`}
                    onClick={() => handleMediaClick(img, 'image')}
                  >
                    <img
                      src={img.url}
                      alt={`${product.title} variant thumbnail ${index + 1}`}
                      className="w-full h-full object-cover rounded-md"
                      loading="lazy"
                      onError={handleMediaError}
                    />
                  </button>
                ))}
                {selectedVariant?.videos?.map((vid, index) => (
                  <button
                    key={`var-vid-${index}`}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all relative ${
                      activeMedia.url === vid.url && activeMedia.type === 'video' ? 'border-red-600' : 'border-gray-200'
                    }`}
                    onClick={() => handleMediaClick(vid, 'video')}
                  >
                    <video
                      src={vid.url}
                      className="w-full h-full object-cover rounded-md"
                      muted
                      preload="metadata"
                      onError={handleMediaError}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product details */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {product.title || 'Untitled Product'}
            </h1>

            {/* SKU */}
            {product.sku && (
              <p className="text-sm text-gray-600">
                SKU: <span className="font-medium">{product.sku}</span>
              </p>
            )}

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {renderStars(product.averageRating || 0)}
              </div>
              <span className="text-gray-600 text-sm sm:text-base">
                {product.numReviews || 0} reviews
              </span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3">
              {currentPrice < originalPrice ? (
                <>
                  <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                    {formatPrice(currentPrice)}
                  </p>
                  <p className="text-base text-gray-500 line-through">
                    {formatPrice(originalPrice)}
                  </p>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">
                    {Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}% OFF
                  </span>
                </>
              ) : (
                <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                  {formatPrice(currentPrice)}
                </p>
              )}
            </div>

            {/* Stock */}
            <p
              className={`text-sm sm:text-base ${
                currentStock > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {currentStock > 0 ? `${currentStock} in stock` : 'Out of stock'}
            </p>

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div>
                <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">
                  Variants
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant, index) => (
                    <button
                      key={variant._id || index}
                      type="button"
                      onClick={() => handleVariantSelect(variant)}
                      className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-600 ${
                        selectedVariant?._id === variant._id
                          ? 'border-red-600 bg-red-50 text-red-600'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                      aria-label={`Select variant ${variant.attributes?.map(a => `${a.key}: ${a.value}`).join(', ')}`}
                    >
                      {variant.attributes?.map(a => `${a.key}: ${a.value}`).join(', ') || `Variant ${index + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                onClick={handleAddToCart}
                className={`flex-1 py-3 px-4 rounded-md text-sm sm:text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 ${
                  currentStock > 0 && !cartLoading
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={currentStock <= 0 || cartLoading}
                aria-label="Add to cart"
              >
                {cartLoading ? 'Adding...' : 'Add to Cart'}
              </Button>
              <Button
                onClick={handleOrderNow}
                className={`flex-1 py-3 px-4 rounded-md text-sm sm:text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 ${
                  currentStock > 0 && !cartLoading
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={currentStock <= 0 || cartLoading}
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

            {/* Features */}
            {product.features?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  Features
                </h3>
                <ul className="text-gray-600 text-sm sm:text-base list-disc pl-5">
                  {product.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specifications */}
            {product.specifications?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  Specifications
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <tbody className="bg-white divide-y divide-gray-200">
                      {product.specifications.map((spec, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                            {spec.key}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {spec.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Variant Details */}
            {selectedVariant && (
              <div className="mt-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  Selected Variant Details
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedVariant.attributes?.map((attr, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 capitalize">
                            {attr.key}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">
                            {attr.value}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                          SKU
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {selectedVariant.sku || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                          Price
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatPrice(selectedVariant.price)}
                        </td>
                      </tr>
                      {selectedVariant.discountPrice && (
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                            Discount Price
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatPrice(selectedVariant.discountPrice)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                          Stock
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${
                          selectedVariant.stock > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : 'Out of stock'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Category */}
            {product.categoryId && (
              <div className="mt-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  Category
                </h3>
                <span className="inline-block bg-gray-100 text-gray-600 text-xs sm:text-sm px-3 py-1 rounded-full">
                  {product.categoryId.name || 'Uncategorized'}
                </span>
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
    PropTypes.shape({
      url: PropTypes.string,
      alt: PropTypes.string,
      public_id: PropTypes.string
    })
  ),
  videos: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string,
      public_id: PropTypes.string
    })
  ),
  features: PropTypes.arrayOf(PropTypes.string),
  specifications: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.string
    })
  ),
  sku: PropTypes.string,
  stock: PropTypes.number,
  averageRating: PropTypes.number,
  numReviews: PropTypes.number,
  description: PropTypes.string,
  categoryId: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string
  }),
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      sku: PropTypes.string,
      price: PropTypes.number,
      discountPrice: PropTypes.number,
      stock: PropTypes.number,
      attributes: PropTypes.arrayOf(
        PropTypes.shape({
          key: PropTypes.string,
          value: PropTypes.string
        })
      ),
      images: PropTypes.arrayOf(
        PropTypes.shape({
          url: PropTypes.string,
          public_id: PropTypes.string
        })
      ),
      videos: PropTypes.arrayOf(
        PropTypes.shape({
          url: PropTypes.string,
          public_id: PropTypes.string
        })
      )
    })
  )
};

export default ProductDetails;