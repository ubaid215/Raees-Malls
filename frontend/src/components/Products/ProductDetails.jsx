import React, { useState, useEffect, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { getProductById } from '../../services/productService';
import { useCart } from '../../context/CartContext';
import Button from '../core/Button';
import LoadingSpinner from '../core/LoadingSpinner';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

const ProductDetails = memo(() => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addItemToCart, isLoading: cartLoading } = useCart();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeMedia, setActiveMedia] = useState({ type: 'image', url: '' });
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    const fetchProductData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedProduct = await getProductById(productId, { isPublic: true });
        console.log('Fetched Product:', JSON.stringify(fetchedProduct, null, 2)); // Debug log

        if (!fetchedProduct) {
          throw new Error('Product not found');
        }

        setProduct(fetchedProduct);

        // Set initial media from base product
        const initialMedia = fetchedProduct.videos?.[0]
          ? { type: 'video', url: fetchedProduct.videos[0].url }
          : fetchedProduct.images?.[0]
            ? { type: 'image', url: fetchedProduct.images[0].url }
            : { type: 'image', url: '/images/placeholder-product.png' };
        console.log('Initial Media:', initialMedia); // Debug log
        setActiveMedia(initialMedia);

        // Do not auto-select variant
        console.log('Variants available:', fetchedProduct.variants?.length || 0); // Debug log
      } catch (err) {
        console.error('Fetch error:', err); // Debug log
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
  const currentStock = selectedVariant ? selectedVariant.stock : product?.stock;
  const price = selectedVariant ? (selectedVariant.discountPrice ?? selectedVariant.price) : (product.discountPrice ?? product.price);

  if (!product || currentStock <= 0) {
    toast.error('Product is out of stock');
    return;
  }

  try {
    await addItemToCart(
      product._id, 
      selectedVariant?._id || null, 
      1,
      price  // Pass the price explicitly
    );
    toast.success('Added to cart');
  } catch (err) {
    toast.error(err.message || 'Failed to add to cart');
  }
};

const handleOrderNow = async () => {
  const currentStock = selectedVariant ? selectedVariant.stock : product?.stock;
  const price = selectedVariant ? (selectedVariant.discountPrice ?? selectedVariant.price) : (product.discountPrice ?? product.price);

  if (!product || currentStock <= 0) {
    toast.error('Product is out of stock');
    return;
  }

  try {
    await addItemToCart(
      product._id, 
      selectedVariant?._id || null, 
      1,
      price  // Pass the price explicitly
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
    console.log('Media Clicked:', { media, type }); // Debug log
    setActiveMedia({ type, url: media.url });
  };

  const handleVariantSelect = (variantId) => {
    const variant = variantId ? product.variants.find((v) => v._id === variantId) : null;
    console.log('Selected Variant:', variant); // Debug log
    setSelectedVariant(variant);
    const media = variant
      ? variant.videos?.[0]
        ? { type: 'video', url: variant.videos[0].url }
        : variant.images?.[0]
          ? { type: 'image', url: variant.images[0].url }
          : product.videos?.[0]
            ? { type: 'video', url: product.videos[0].url }
            : product.images?.[0]
              ? { type: 'image', url: product.images[0].url }
              : { type: 'image', url: '/images/placeholder-product.png' }
      : product.videos?.[0]
        ? { type: 'video', url: product.videos[0].url }
        : product.images?.[0]
          ? { type: 'image', url: product.images[0].url }
          : { type: 'image', url: '/images/placeholder-product.png' };
    console.log('Active Media Set:', media); // Debug log
    setActiveMedia(media);
  };

  const handleMediaError = (e) => {
    console.warn('Media failed to load:', e.target.src); // Debug log
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

  const formatPrice = (price) => {
    console.log('Formatting Price:', price); // Debug log
    if (!Number.isFinite(price)) {
      console.warn('Invalid price:', price); // Debug log
      return 'Price unavailable';
    }
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getVariantLabel = (variant, index) => {
    const firstAttr = variant.attributes?.[0];
    if (firstAttr?.value) {
      return firstAttr.value.charAt(0).toUpperCase() + firstAttr.value.slice(1);
    }
    return `Variant ${index + 1}`;
  };

  const renderStars = (rating = 0) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-yellow-400" />);
      }
    }
    return stars;
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
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

  const currentPrice = selectedVariant
    ? selectedVariant.discountPrice ?? selectedVariant.price
    : product.discountPrice ?? product.price;
  const originalPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;
  console.log('Price and Stock:', { currentPrice, originalPrice, currentStock }); // Debug log

  const hasDiscount = Number.isFinite(currentPrice) && Number.isFinite(originalPrice) && currentPrice < originalPrice;
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          {/* Media section */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
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

            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images?.length > 0 &&
                product.images.map((img, index) => (
                  <button
                    key={`img-${index}`}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all ${
                      activeMedia.url === img.url && activeMedia.type === 'image' ? 'border-red-600' : 'border-gray-200'
                    }`}
                    onClick={() => handleMediaClick(img, 'image')}
                    aria-label={`View image ${index + 1}`}
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
              {product.videos?.length > 0 &&
                product.videos.map((vid, index) => (
                  <button
                    key={`vid-${index}`}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all relative ${
                      activeMedia.url === vid.url && activeMedia.type === 'video' ? 'border-red-600' : 'border-gray-200'
                    }`}
                    onClick={() => handleMediaClick(vid, 'video')}
                    aria-label={`View video ${index + 1}`}
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
              {selectedVariant?.images?.length > 0 ? (
                selectedVariant.images.map((img, index) => (
                  <button
                    key={`var-img-${index}`}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all ${
                      activeMedia.url === img.url && activeMedia.type === 'image' ? 'border-red-600' : 'border-gray-200'
                    }`}
                    onClick={() => handleMediaClick(img, 'image')}
                    aria-label={`View variant image ${index + 1}`}
                  >
                    <img
                      src={img.url}
                      alt={`${product.title} variant thumbnail ${index + 1}`}
                      className="w-full h-full object-cover rounded-md"
                      loading="lazy"
                      onError={handleMediaError}
                    />
                  </button>
                ))
              ) : selectedVariant ? (
                <p className="text-sm text-gray-500">No variant images available</p>
              ) : null}
              {selectedVariant?.videos?.length > 0 &&
                selectedVariant.videos.map((vid, index) => (
                  <button
                    key={`var-vid-${index}`}
                    type="button"
                    className={`flex-shrink-0 w-16 h-16 border-2 rounded-md cursor-pointer transition-all relative ${
                      activeMedia.url === vid.url && activeMedia.type === 'video' ? 'border-red-600' : 'border-gray-200'
                    }`}
                    onClick={() => handleMediaClick(vid, 'video')}
                    aria-label={`View variant video ${index + 1}`}
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
              {console.log('Rendering Variant Images:', selectedVariant?.images?.length || 0)} {/* Debug log */}
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {product.title || 'Untitled Product'}
            </h1>

            <div className="flex items-center gap-2">
              <div className="flex">{renderStars(product.averageRating || 0)}</div>
              <span className="text-gray-600 text-sm sm:text-base">{product.numReviews || 0} reviews</span>
            </div>

            <p className="text-sm text-gray-600">
              SKU: <span className="font-medium">{selectedVariant?.sku || product.sku || 'N/A'}</span>
            </p>

            <div className="flex items-center gap-3">
              <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">{formatPrice(currentPrice)}</p>
              {hasDiscount && (
                <>
                  <p className="text-base text-gray-500 line-through">{formatPrice(originalPrice)}</p>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">
                    {discountPercentage}% OFF
                  </span>
                </>
              )}
            </div>

            <p
              className={`text-sm sm:text-base ${
                currentStock > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {currentStock > 0 ? `${currentStock} in stock` : 'Out of stock'}
            </p>

            {product.variants?.length > 0 && (
              <div className="mt-4">
                <label htmlFor="variant-select" className="text-sm sm:text-base font-medium text-gray-900 mb-2 block">
                  Select Variant
                </label>
                <select
                  id="variant-select"
                  value={selectedVariant?._id || ''}
                  onChange={(e) => handleVariantSelect(e.target.value)}
                  className="w-full sm:w-64 border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-red-600"
                  aria-label="Select product variant"
                >
                  <option value="">Select a variant</option>
                  {product.variants.map((variant, index) => (
                    <option key={variant._id || index} value={variant._id}>
                      {getVariantLabel(variant, index)} - {formatPrice(variant.discountPrice ?? variant.price)}
                      {variant.stock <= 0 && ' (Out of stock)'}
                    </option>
                  ))}
                </select>

                {/* Variant Summary */}
                {selectedVariant && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Selected:</span> {getVariantLabel(selectedVariant, product.variants.indexOf(selectedVariant))}
                    </p>
                    <p>
                      <span className="font-medium">Price:</span> {formatPrice(selectedVariant.discountPrice ?? selectedVariant.price)}
                      {selectedVariant.discountPrice && (
                        <span className="text-gray-500 line-through ml-2">{formatPrice(selectedVariant.price)}</span>
                      )}
                    </p>
                    <p>
                      <span className="font-medium">Stock:</span>{' '}
                      {selectedVariant.stock > 0 ? (
                        <span className="text-green-600">{selectedVariant.stock} in stock</span>
                      ) : (
                        <span className="text-red-600">Out of stock</span>
                      )}
                    </p>
                    {selectedVariant.attributes?.length > 0 && (
                      <p>
                        <span className="font-medium">Attributes:</span>{' '}
                        {selectedVariant.attributes.map((a) => `${a.key}: ${a.value}`).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

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

            <div className="mt-4">
              <h3
                className="text-base sm:text-lg font-medium text-gray-900 mb-2 cursor-pointer flex justify-between items-center"
                onClick={() => toggleSection('description')}
              >
                <span>Description</span>
                <span className="text-lg">{expandedSection === 'description' ? '−' : '+'}</span>
              </h3>
              {expandedSection === 'description' && (
                <p className="text-gray-600 text-sm sm:text-base">
                  {product.description || 'No description available'}
                </p>
              )}
            </div>

            {product.features?.length > 0 && (
              <div className="mt-4">
                <h3
                  className="text-base sm:text-lg font-medium text-gray-900 mb-2 cursor-pointer flex justify-between items-center"
                  onClick={() => toggleSection('features')}
                >
                  <span>Features</span>
                  <span className="text-lg">{expandedSection === 'features' ? '−' : '+'}</span>
                </h3>
                {expandedSection === 'features' && (
                  <ul className="text-gray-600 text-sm sm:text-base list-disc pl-5 space-y-1">
                    {product.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {product.specifications?.length > 0 && (
              <div className="mt-4">
                <h3
                  className="text-base sm:text-lg font-medium text-gray-900 mb-2 cursor-pointer flex justify-between items-center"
                  onClick={() => toggleSection('specifications')}
                >
                  <span>Specifications</span>
                  <span className="text-lg">{expandedSection === 'specifications' ? '−' : '+'}</span>
                </h3>
                {expandedSection === 'specifications' && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="bg-white divide-y divide-gray-200">
                        {product.specifications.map((spec, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                              {spec.key}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{spec.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {selectedVariant && (
              <div className="mt-4">
                <h3
                  className="text-base sm:text-lg font-medium text-gray-900 mb-2 cursor-pointer flex justify-between items-center"
                  onClick={() => toggleSection('variant')}
                >
                  <span>Selected Variant Details</span>
                  <span className="text-lg">{expandedSection === 'variant' ? '−' : '+'}</span>
                </h3>
                {expandedSection === 'variant' && (
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
                          <td
                            className={`px-4 py-3 whitespace-nowrap text-sm ${
                              selectedVariant.stock > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : 'Out of stock'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {product.categoryId && (
              <div className="mt-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Category</h3>
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
      public_id: PropTypes.string,
    }),
  ),
  videos: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string,
      public_id: PropTypes.string,
    }),
  ),
  features: PropTypes.arrayOf(PropTypes.string),
  specifications: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.string,
    }),
  ),
  sku: PropTypes.string,
  stock: PropTypes.number,
  averageRating: PropTypes.number,
  numReviews: PropTypes.number,
  description: PropTypes.string,
  categoryId: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string,
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
          value: PropTypes.string,
        }),
      ),
      images: PropTypes.arrayOf(
        PropTypes.shape({
          url: PropTypes.string,
          public_id: PropTypes.string,
        }),
      ),
      videos: PropTypes.arrayOf(
        PropTypes.shape({
          url: String,
          public_id: String,
        }),
      ),
    }),
  ),
};

export default ProductDetails;