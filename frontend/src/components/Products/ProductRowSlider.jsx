import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const [isMobile, setIsMobile] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const carouselRef = useRef(null);
  const intervalRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);

  const memoizedProducts = useMemo(() => {
    // Only log once when products actually change, not on every render
    if (!hasInitialized && products && products.length > 0) {
      console.log('Products loaded for ProductRowSlider:', products.length);
      setHasInitialized(true);
    }
    
    const productArray = Array.isArray(products) ? products : [];

    const mappedProducts = productArray.map((product) => {
      const images = Array.isArray(product.images) ? product.images : [];

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

      if (processedImages.length === 0) {
        processedImages.push({
          url: '/images/placeholder-product.png',
          alt: 'Placeholder product image'
        });
      }

      return {
        _id: product._id,
        title: product.title || product.name || 'Untitled Product',
        price: product.price || 0,
        discountPrice: product.discountPrice || null,
        images: processedImages,
        averageRating: product.averageRating || product.rating || 0,
        numReviews: product.numReviews || 0,
        stock: product.stock || 0,
        sku: product.sku || '',
        categoryId: product.categoryId || null,
        isFeatured: product.isFeatured || false
      };
    });

    return mappedProducts;
  }, [products, hasInitialized]);

  // Handle location changes separately to avoid repeated logs
  useEffect(() => {
    if (locationRef.current !== location.pathname) {
      console.log('Location changed, clearing cache');
      locationRef.current = location.pathname;
      
      const clearProductCaches = () => {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('products_') || key.startsWith('product_') || key.startsWith('featured_products_')) {
            localStorage.removeItem(key);
          }
        });
      };

      clearProductCaches();
      setNeedsFetch(true);
      setHasInitialized(false);
    }
  }, [location.pathname]);

  // Fetch products only when needed
  const handleFetchProducts = useCallback(async () => {
    try {
      const params = {
        page: 1,
        limit: 12,
        sort: '-createdAt',
        ...(categoryId ? { category: categoryId } : {}),
        ...(isFeatured ? { isFeatured: true } : {})
      };
      await fetchProducts(params, { isPublic: true, skipCache: true });
      setNeedsFetch(false);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error(err.message || 'Failed to load products');
      setNeedsFetch(false);
    }
  }, [fetchProducts, categoryId, isFeatured]);

  // Only fetch when actually needed
  useEffect(() => {
    if (needsFetch && !loading) {
      handleFetchProducts();
    }
  }, [needsFetch, loading, handleFetchProducts]);

  // Socket connection - only set up once
  useEffect(() => {
    SocketService.connect();

    const handleProductCreated = (data) => {
      if (data.product.stock > 0 &&
          (isFeatured ? data.product.isFeatured : true) &&
          (categoryId ? data.product.categoryId === categoryId : true)) {
        setNeedsFetch(true);
        setHasInitialized(false);
        toast.success(`New product added: ${data.product.title}`);
      }
    };

    const handleProductUpdated = (data) => {
      if ((isFeatured ? data.product.isFeatured : true) &&
          (categoryId ? data.product.categoryId === categoryId : true)) {
        setNeedsFetch(true);
        setHasInitialized(false);
        toast.info(`Product updated: ${data.product.title}`);
      }
    };

    const handleProductDeleted = () => {
      setNeedsFetch(true);
      setHasInitialized(false);
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
  }, []); // Empty dependency array - only run once

  const getVisibleItemsCount = useCallback(() => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width < 640) return 2;
    if (width < 768) return 2;
    if (width < 1024) return 3;
    return 4;
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const newVisibleItems = getVisibleItemsCount();
      setVisibleItems(newVisibleItems);
      setIsMobile(window.innerWidth < 768);
      
      const maxIndex = Math.max(0, Math.ceil(memoizedProducts.length / newVisibleItems) - 1);
      if (currentIndex > maxIndex && maxIndex >= 0) {
        setCurrentIndex(maxIndex);
      }
    };

    // Set initial values
    setVisibleItems(getVisibleItemsCount());
    setIsMobile(window.innerWidth < 768);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getVisibleItemsCount, memoizedProducts.length, currentIndex]);

  const handlePrev = useCallback(() => {
    const maxIndex = Math.max(0, Math.ceil(memoizedProducts.length / visibleItems) - 1);

    setCurrentIndex((prev) => {
      if (prev === 0) return maxIndex;
      return Math.max(0, prev - 1);
    });

    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [memoizedProducts.length, visibleItems]);

  const handleNext = useCallback(() => {
    const maxIndex = Math.max(0, Math.ceil(memoizedProducts.length / visibleItems) - 1);

    setCurrentIndex((prev) => {
      if (prev >= maxIndex) return 0;
      return Math.min(maxIndex, prev + 1);
    });

    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [memoizedProducts.length, visibleItems]);

  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || memoizedProducts.length === 0 || memoizedProducts.length <= visibleItems) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.max(0, Math.ceil(memoizedProducts.length / visibleItems) - 1);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlaying, memoizedProducts.length, visibleItems]);

  if (loading && memoizedProducts.length === 0) {
    return (
      <section className="relative w-full px-4 py-8 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6 px-4">
          {title && <h2 className="text-2xl font-bold text-gray-800">{title}</h2>}
        </div>
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (error || memoizedProducts.length === 0) {
    return (
      <section className="relative w-full px-4 py-8 rounded-lg shadow-sm">
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

  return (
    <section className="relative w-full px-4 py-8 rounded-lg shadow-sm" aria-live="polite">
      <Helmet>
        <title>{title || 'Products'} | Raees Malls</title>
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
              <div className="p-1">
                <ProductCard 
                  product={product} 
                  compact={isMobile} 
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handlePrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg"
          aria-label="Previous products"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg"
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