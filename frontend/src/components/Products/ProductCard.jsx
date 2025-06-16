import React, { memo, useState, useEffect } from 'react';
import { CiShoppingCart } from 'react-icons/ci';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Button from '../core/Button';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useProduct } from '../../context/ProductContext';
import PropTypes from 'prop-types';

const ProductCard = memo(({ productId, product: initialProduct }) => {
  const navigate = useNavigate();
  const { addItemToCart } = useCart();
  const { user } = useAuth();
  const { getProduct } = useProduct();
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [addToCartStatus, setAddToCartStatus] = useState({
    loading: false,
    success: false,
    error: null
  });

  useEffect(() => {
    if (productId && !initialProduct) {
      const fetchProduct = async () => {
        try {
          setLoading(true);
          const fetchedProduct = await getProduct(productId, { skipCache: false });
          setProduct(fetchedProduct);
        } catch (error) {
          console.error('Failed to fetch product:', error);
          toast.error('Failed to load product details');
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [productId, initialProduct, getProduct]);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="animate-pulse">
          <div className="bg-gray-200 w-full aspect-square sm:aspect-[4/3]"></div>
          <div className="p-3 sm:p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product || !product._id) {
    console.warn('Invalid product data:', product);
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-center p-4">
        <p className="text-red-500 text-sm">Product not available</p>
      </div>
    );
  }

  const handleCardClick = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'A') {
      return;
    }
    navigate(`/product/${product._id}`);
  };

  const handleAddToCartClick = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.info('Please login to add items to cart', {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: "bg-white text-gray-800 border-l-4 border-blue-500 shadow-md",
        bodyClassName: "font-medium"
      });
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    setAddToCartStatus({ loading: true, success: false, error: null });
    
    try {
      const result = await addItemToCart(product._id, null, 1);
      if (result.success) {
        toast.success(result.message || `${product.title} added to cart!`);
        setAddToCartStatus({
          loading: false,
          success: true,
          error: null
        });
      } else {
        throw new Error(result.message || 'Failed to add to cart');
      }
    } catch (err) {
      const errorMessage = err.message.includes('Validation failed')
        ? 'Invalid product or quantity. Please try again.'
        : err.message || 'Failed to add to cart';
      toast.error(errorMessage);
      setAddToCartStatus({
        loading: false,
        success: false,
        error: errorMessage
      });
    }
  };

  const formattedPrice = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(product.discountPrice || product.price);

  const handleMediaError = (e) => {
    console.warn('Media failed to load:', e.target.src);
    e.target.src = '/images/placeholder-product.png';
    e.target.onerror = null;
    if (e.target.tagName === 'VIDEO') {
      e.target.outerHTML = `<img
        src="${product.images?.[0]?.url || '/images/placeholder-product.png'}"
        alt="${product.images?.[0]?.alt || product.title}"
        className="w-full aspect-square sm:aspect-[4/3] object-cover"
        loading="lazy"
      />`;
    }
  };

  const categoryNames = product.categoryId?.name ? product.categoryId.name : 'Uncategorized';

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

  const getButtonState = () => {
    if (addToCartStatus.loading) return 'Adding...';
    if (addToCartStatus.success) return 'Added!';
    if (addToCartStatus.error) return 'Try Again';
    return 'Add to Cart';
  };

  const isOutOfStock = product.stock <= 0;
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;

  const primaryMedia = product.videos?.[0]?.url
    ? { type: 'video', url: product.videos[0].url }
    : product.images?.[0]?.url
      ? { type: 'image', url: product.images[0].url }
      : { type: 'image', url: '/images/placeholder-product.png' };

  const mediaUrl = primaryMedia.url.startsWith('http')
    ? primaryMedia.url
    : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${primaryMedia.url}`;

  const displayedFeatures = (product.features || [])
    .slice(0, 2)
    .map(f => f.length > 30 ? `${f.slice(0, 27)}...` : f);

  return (
    <>
      <style>{`
        @keyframes vibrate {
          0% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(2px, 1px) rotate(0.5deg); }
          40% { transform: translate(-1px, -2px) rotate(-0.5deg); }
          60% { transform: translate(1px, -1px) rotate(0.5deg); }
          80% { transform: translate(-2px, 1px) rotate(-0.5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        .vibrate-on-hover:hover {
          animation: vibrate 0.5s ease-in-out;
        }
        .discount-tag:hover {
          transform: scale(1.05);
          transition: transform 0.2s ease-in-out;
        }
      `}</style>
      <div
        className="w-full max-w-[180px] xs:max-w-[200px] sm:max-w-none bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col touch-manipulation mx-auto"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick(e)}
        aria-label={`View ${product.title} details`}
      >
        <div className="relative">
          {primaryMedia.type === 'video' ? (
            <video
              src={mediaUrl}
              alt={product.title}
              className="w-full aspect-square sm:aspect-[4/3] object-cover"
              muted
              controls
              preload="metadata"
              onError={handleMediaError}
            />
          ) : (
            <img
              src={mediaUrl}
              alt={product.images?.[0]?.alt || product.title}
              className="w-full aspect-square sm:aspect-[4/3] object-cover"
              loading="lazy"
              onError={handleMediaError}
            />
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium max-w-[120px] sm:max-w-[140px] ${
              isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {isOutOfStock ? 'Out of Stock' : `In Stock (${product.stock})`}
            </span>
            {product.isFeatured && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded bg-yellow-500 text-white text-[10px] sm:text-xs font-medium max-w-[120px] sm:max-w-[140px]">
                Featured
              </span>
            )}
          </div>
        </div>

        <div className="p-2 sm:p-4 flex flex-col gap-1 sm:gap-2 flex-grow">
          <h2 className="text-sm sm:text-lg font-semibold text-gray-800 hover:text-red-600 line-clamp-2 leading-tight">
            {product.title}
          </h2>
          <p className="text-xs text-gray-500 hidden sm:block">
            {/* SKU: <span className="text-gray-700 font-medium">{product.sku || 'N/A'}</span> */}
          </p>
          <p className="text-xs text-gray-500 line-clamp-1 hidden sm:block">
            Category: <span className="text-gray-700">{categoryNames}</span>
          </p>
          
          {displayedFeatures.length > 0 && (
            <ul className="text-xs text-gray-600 mt-1 sm:mt-2 hidden sm:block">
              {displayedFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-1">
                  <span className="text-red-600">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-1 sm:mt-2 flex items-center gap-1 sm:gap-2 flex-wrap">
            {hasDiscount ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-1 sm:gap-2">
                  <p className="text-sm sm:text-lg font-bold text-red-600">{formattedPrice}</p>
                  <span className="inline-flex px-1.5 sm:px-2 py-0.5 rounded bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] sm:text-xs font-medium discount-tag">
                    {Math.round(((product.price - product.discountPrice) / product.price) * 100)}% OFF
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 line-through">
                  {new Intl.NumberFormat('en-PK', {
                    style: 'currency',
                    currency: 'PKR',
                    minimumFractionDigits: 0,
                  }).format(product.price)}
                </p>
              </div>
            ) : (
              <p className="text-sm sm:text-lg font-bold text-gray-900">{formattedPrice}</p>
            )}
          </div>

          <Button
            onClick={handleAddToCartClick}
            className={`mt-2 sm:mt-3 w-full ${
              addToCartStatus.loading ? 'bg-gray-500' :
              addToCartStatus.success ? 'bg-green-600' :
              addToCartStatus.error ? 'bg-yellow-600' :
              isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
            } text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-md flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm`}
            aria-label={`Add ${product.title} to cart`}
            disabled={isOutOfStock || addToCartStatus.loading}
            icon={CiShoppingCart}
          >
            {isOutOfStock ? 'Out of Stock' : getButtonState()}
          </Button>
        </div>
      </div>
    </>
  );
});

ProductCard.propTypes = {
  productId: PropTypes.string,
  product: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    price: PropTypes.number,
    discountPrice: PropTypes.number,
    images: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        public_id: PropTypes.string,
        alt: PropTypes.string,
      })
    ),
    videos: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        public_id: PropTypes.string,
      })
    ),
    features: PropTypes.arrayOf(PropTypes.string),
    averageRating: PropTypes.number,
    numReviews: PropTypes.number,
    stock: PropTypes.number,
    sku: PropTypes.string,
    categoryId: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string,
      }),
    ]),
    isFeatured: PropTypes.bool,
    variants: PropTypes.arrayOf(
      PropTypes.shape({
        sku: PropTypes.string,
        price: PropTypes.number,
        discountPrice: PropTypes.number,
        stock: PropTypes.number,
        attributes: PropTypes.arrayOf(
          PropTypes.shape({
            key: PropTypes.string,
            value: PropTypes.string,
          })
        ),
        images: PropTypes.arrayOf(
          PropTypes.shape({
            url: PropTypes.string,
            public_id: PropTypes.string,
          })
        ),
        videos: PropTypes.arrayOf(
          PropTypes.shape({
            url: PropTypes.string,
            public_id: PropTypes.string,
          })
        ),
      })
    ),
  }),
};

ProductCard.defaultProps = {
  product: null,
  productId: null,
};

export default ProductCard;