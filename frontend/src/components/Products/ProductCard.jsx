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

  const handleImageError = (e) => {
    console.warn('Image failed to load:', e.target.src);
    e.target.src = '/images/placeholder-product.png';
    e.target.onerror = null;
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

  // Ensure image URL is valid
  const imageUrl = product.images?.[0]?.url
    ? product.images[0].url.startsWith('http')
      ? product.images[0].url
      : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${product.images[0].url}`
    : '/images/placeholder-product.png';

  return (
    <div
      className="w-full max-w-[180px] xs:max-w-[200px] sm:max-w-none bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col touch-manipulation mx-auto"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(e)}
      aria-label={`View ${product.title} details`}
    >
      <div className="relative">
        <img
          src={imageUrl}
          alt={product.images?.[0]?.alt || product.title}
          className="w-full aspect-square sm:aspect-[4/3] object-cover"
          loading="lazy"
          onError={handleImageError}
        />
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${
          isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {isOutOfStock ? 'Out of Stock' : `In Stock (${product.stock})`}
        </span>
        {hasDiscount && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-red-600 text-white text-xs font-medium">
            {Math.round((1 - product.discountPrice / product.price) * 100)}% OFF
          </span>
        )}
      </div>

      <div className="p-2 sm:p-4 flex flex-col gap-1 sm:gap-2 flex-grow">
        <h2 className="text-sm sm:text-lg font-semibold text-gray-800 hover:text-red-600 line-clamp-2 leading-tight">
          {product.title}
        </h2>
        <p className="text-xs text-gray-500 hidden sm:block">
          SKU: <span className="text-gray-700 font-medium">{product.sku || 'N/A'}</span>
        </p>
        <p className="text-xs text-gray-500 line-clamp-1 hidden sm:block">
          Category: <span className="text-gray-700">{categoryNames}</span>
        </p>
        
        <div className="mt-1 sm:mt-2">
          {hasDiscount ? (
            <div className="flex flex-col">
              <p className="text-sm sm:text-lg font-bold text-red-600">{formattedPrice}</p>
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

        <div className="flex items-center gap-1 text-xs mt-auto">
          {renderStars(product.averageRating || 0)}
          {product.numReviews ? (
            <span className="text-gray-500 ml-1">({product.numReviews})</span>
          ) : (
            <span className="text-gray-500 ml-1">No reviews</span>
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
        >
          <CiShoppingCart size={14} className="sm:w-5 sm:h-5" />
          <span>
            {isOutOfStock ? 'Out of Stock' : getButtonState()}
          </span>
        </Button>
      </div>
    </div>
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
  }),
};

ProductCard.defaultProps = {
  product: null,
  productId: null,
};

export default ProductCard;