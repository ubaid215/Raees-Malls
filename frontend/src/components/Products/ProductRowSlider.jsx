import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductContext } from '../../context/ProductContext';
import ProductCard from './ProductCard';
import Button from '../core/Button';
import LoadingSpinner from '../core/LoadingSpinner';
import { API_BASE_URL } from '../shared/config';
import SocketService from '../../services/socketService';
import { toast } from 'react-toastify';

function ProductRowSlider({ title, isFeatured = false, categoryId = '' }) {
  const { products, loading, error, fetchProducts } = useContext(ProductContext);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [visibleItems, setVisibleItems] = useState(4);
  const [needsFetch, setNeedsFetch] = useState(true);
  const carouselRef = useRef(null);
  const intervalRef = useRef(null);
  const navigate = useNavigate();

  // Process and memoize products
  const memoizedProducts = useMemo(() => {
    const productArray = Array.isArray(products) ? products : [];
    
    const filteredProducts = isFeatured
      ? productArray.filter((product) => product.isFeatured === true)
      : productArray;

    return filteredProducts.map((product) => {
      // Ensure images is always an array
      const images = Array.isArray(product.images) ? product.images : [];
      
      // Process image URLs
      const processedImages = images.map(img => {
        let url = img?.url || '';
        if (url && !url.startsWith('http')) {
          url = `${API_BASE_URL}${url}`;
        }
        return {
          url: url || '/images/placeholder-product.png',
          alt: img?.alt || product.title || 'Product image'
        };
      });

      // Ensure at least one image exists
      if (processedImages.length === 0) {
        processedImages.push({
          url: '/images/placeholder-product.png',
          alt: 'Placeholder product image'
        });
      }

      return {
        _id: product._id,
        title: product.title || product.name || 'Untitled Product',
        price: product.discountPrice || product.price || 0,
        originalPrice: product.originalPrice || product.price || 0,
        discountPercentage: product.originalPrice && product.originalPrice > product.price
          ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
          : 0,
        images: processedImages,
        rating: product.rating || product.averageRating || 0,
        numReviews: product.numReviews || 0,
        stock: product.stock || 0,
        sku: product.sku || '',
        categoryId: product.categoryId || null
      };
    });
  }, [products, isFeatured]);

  // Clear cache on mount to ensure fresh data
  useEffect(() => {
    const clearProductCaches = () => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('products_') || key.startsWith('product_')) {
          localStorage.removeItem(key);
        }
      });
    };

    clearProductCaches();
    setNeedsFetch(true); // Trigger fresh fetch
  }, []);

  // Fetch products
  useEffect(() => {
    if (needsFetch) {
      handleFetchProducts();
    }
  }, [needsFetch, categoryId, isFeatured]);

  const handleFetchProducts = useCallback(async () => {
    try {
      await fetchProducts(
        { page: 1, limit: 12, categoryId: categoryId || null, isFeatured, sort: '-createdAt' },
        { isPublic: true, skipCache: true } // Skip cache to avoid stale data
      );
      setNeedsFetch(false);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error(err.message || 'Failed to load products');
    }
  }, [fetchProducts, categoryId, isFeatured]);

  // Socket.IO integration for real-time updates
  useEffect(() => {
    SocketService.connect();

    const handleProductCreated = (data) => {
      // Trigger fetch if the new product matches the category/isFeatured and is in stock
      if (data.product.stock > 0 &&
          (isFeatured ? data.product.isFeatured : true) &&
          (categoryId ? data.product.categoryId === categoryId : true)) {
        setNeedsFetch(true);
        toast.success(`New product added: ${data.product.title}`);
      }
    };

    const handleProductUpdated = (data) => {
      // Trigger fetch if the product matches the category/isFeatured
      if ((isFeatured ? data.product.isFeatured : true) &&
          (categoryId ? data.product.categoryId === categoryId : true)) {
        setNeedsFetch(true);
        toast.info(`Product updated: ${data.product.title}`);
      }
    };

    const handleProductDeleted = (data) => {
      // Trigger fetch to refresh the list
      setNeedsFetch(true);
      toast.warn('Product removed');
    };

    SocketService.on('productCreated', handleProductCreated);
    SocketService.on('productUpdated', handleProductUpdated);
    SocketService.on('productDeleted', handleProductDeleted);

    return () => {
      SocketService.off('productCreated', handleProductCreated);
      SocketService.off('productUpdated', handleProductUpdated);
      SocketService.off('productDeleted', handleProductDeleted);
      SocketService.disconnect();
    };
  }, [isFeatured, categoryId]);

  // Calculate number of visible items based on screen width
  const getVisibleItemsCount = useCallback(() => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width < 480) return 1;  // Smaller mobile screens
    if (width < 640) return 2;  // Larger mobile screens
    if (width < 768) return 2;  // Small tablets
    if (width < 1024) return 3; // Large tablets
    return 4;                   // Desktops
  }, []);

  // Handle window resize to adjust visible items
  useEffect(() => {
    const handleResize = () => {
      setVisibleItems(getVisibleItemsCount());
    };
    
    window.addEventListener('resize', handleResize);
    setVisibleItems(getVisibleItemsCount());
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [getVisibleItemsCount]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === 0 ? Math.ceil(memoizedProducts.length / visibleItems) - 1 : prev - 1
    );
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [memoizedProducts.length, visibleItems]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === Math.ceil(memoizedProducts.length / visibleItems) - 1 ? 0 : prev + 1
    );
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [memoizedProducts.length, visibleItems]);

  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  // Auto-play slider
  useEffect(() => {
    if (!isAutoPlaying || memoizedProducts.length === 0) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === Math.ceil(memoizedProducts.length / visibleItems) - 1 ? 0 : prev + 1
      );
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlaying, memoizedProducts.length, visibleItems]);

  // Loading state
  if (loading && memoizedProducts.length === 0) {
    return (
      <section aria-label={`${title} Slider Loading`} className="relative w-full px-4 py-8 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6 px-4">
          {title && <h2 className="text-2xl font-bold text-gray-800">{title}</h2>}
        </div>
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  // Error or empty state
  if (error || memoizedProducts.length === 0) {
    return (
      <section aria-label={`${title} Slider Empty or Error`} className="relative w-full px-4 py-8 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6 px-4">
          {title && <h2 className="text-2xl font-bold text-gray-800">{title}</h2>}
          <nav>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:underline transition-colors"
              onClick={() => navigate(categoryId ? `/products?category=${categoryId}` : '/products')}
              aria-label="View all products"
            >
              <span className="text-sm font-medium">View All</span>
              <ArrowRight size={16} />
            </Button>
          </nav>
        </div>
        <div className="text-center">
          <p className="text-lg text-gray-500 mb-4">
            {error ? `Failed to load products: ${error}` : 'No products found.'}
          </p>
          <Button
            onClick={handleFetchProducts}
            variant="outline"
            disabled={loading}
          >
            {loading ? 'Loading...' : error ? 'Retry Now' : 'Load Products'}
          </Button>
        </div>
      </section>
    );
  }

  // Main render
  return (
    <section aria-label={`${title} Slider`} className="relative w-full px-4 py-8 rounded-lg shadow-sm" aria-live="polite">
      <Helmet>
        <title>{title || 'Products'} | Your Store</title>
        <meta name="description" content={`Explore our ${title?.toLowerCase() || 'selected products'} with exclusive deals and limited stock.`} />
      </Helmet>

      <div className="flex justify-between items-center mb-6 px-4">
        {title && <h2 className="text-2xl font-bold text-gray-800">{title}</h2>}
        <nav>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:underline transition-colors"
            onClick={() => navigate(categoryId ? `/products?category=${categoryId}` : '/products')}
            aria-label="View all products"
          >
            <span className="text-sm font-medium">View All</span>
            <ArrowRight size={16} />
          </Button>
        </nav>
      </div>

      <div className="relative overflow-hidden group">
        <div
          ref={carouselRef}
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / visibleItems)}%)`,
          }}
        >
          {memoizedProducts.map((product) => (
            <div
              key={product._id}
              className="flex-shrink-0 px-2"
              style={{ width: `${100 / visibleItems}%` }}
            >
              <div className="p-1"> {/* Added padding for mobile */}
                <ProductCard 
                  product={product} 
                  compact={window.innerWidth < 768} // Make cards compact on mobile
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handlePrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
          aria-label="Previous products"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
          aria-label="Next products"
        >
          <ChevronRight size={24} className="text-gray-700" />
        </button>
      </div>

      {memoizedProducts.length > visibleItems && (
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: Math.ceil(memoizedProducts.length / visibleItems) }).map(
            (_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-red-500 w-6' : 'bg-gray-300'
                }`}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentIndex ? 'true' : 'false'}
              />
            )
          )}
        </div>
      )}
    </section>
  );
}

export default ProductRowSlider;