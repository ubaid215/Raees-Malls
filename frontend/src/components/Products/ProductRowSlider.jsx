/* eslint-disable no-undef */
import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductContext } from '../../context/ProductContext';
import ProductCard from './ProductCard';
import Button from '../core/Button';
import LoadingSpinner from '../core/LoadingSpinner';
import { API_BASE_URL } from '../shared/config';

function ProductRowSlider({ title, isFeatured = false, categoryId = '' }) {
  const { products, loading, error, fetchProducts } = useContext(ProductContext);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [visibleItems, setVisibleItems] = useState(4);
  const [needsFetch, setNeedsFetch] = useState(true);
  const carouselRef = useRef(null);
  const intervalRef = useRef(null);
  const navigate = useNavigate();

  const getVisibleItemsCount = useCallback(() => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width < 640) return 1;
    if (width < 768) return 2;
    if (width < 1024) return 3;
    return 4;
  }, []);

  const memoizedProducts = useMemo(() => {
    const filteredProducts = isFeatured
      ? (products || []).filter((product) => product.isFeatured === true)
      : products || [];

    return filteredProducts.map((product) => ({
      _id: product._id,
      title: product.title || product.name || 'Untitled Product',
      price: product.discountPrice || product.price || 0,
      originalPrice: product.originalPrice || product.price || 0,
      discountPercentage: product.originalPrice && product.originalPrice > product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0,
      images: product.images?.map((img) =>
        img.url?.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`
      ) || ['/placeholder-product.png'],
      rating: product.rating || product.averageRating || 0,
      numReviews: product.numReviews || 0,
      stock: product.stock || 0,
    }));
  }, [products, isFeatured]);

  const handleFetchProducts = useCallback(async () => {
    try {
      await fetchProducts(1, 12, categoryId || null, isFeatured, { isPublic: true });
      setNeedsFetch(false);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [fetchProducts, categoryId, isFeatured]);

  useEffect(() => {
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setVisibleItems(getVisibleItemsCount());
      }, 100);
    };
    let resizeTimeout;
    window.addEventListener('resize', handleResize);
    setVisibleItems(getVisibleItemsCount());
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [getVisibleItemsCount]);

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

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === 0 ? Math.ceil(memoizedProducts.length / visibleItems) - 1 : prev - 1
    );
    setIsAutoPlaying(true);
  }, [memoizedProducts.length, visibleItems]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === Math.ceil(memoizedProducts.length / visibleItems) - 1 ? 0 : prev + 1
    );
    setIsAutoPlaying(true);
  }, [memoizedProducts.length, visibleItems]);

  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
    setIsAutoPlaying(true);
  }, []);

  if (loading && products.length === 0) {
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

  if (error || products.length === 0 || needsFetch) {
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
            {error ? 'Failed to load products.' : 'No products loaded.'}
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
    <section aria-label={`${title} Slider`} className="relative w-full px-4 py-8 rounded-lg shadow-sm" aria-live="polite">
      <Helmet>
        <title>{title || 'Products'} | Your Store</title>
        <meta name="description" content={`Explore our ${title?.toLowerCase() || 'selected products'} with exclusive deals and limited stock.`} />
      </Helmet>
      <div className="flex justify-between items-center mb-6 px-4">
        {title && (
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        )}
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

      <div className="relative overflow-hidden">
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
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <button
          onClick={handlePrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors duration-200"
          aria-label="Previous products"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors duration-200"
          aria-label="Next products"
        >
          <ChevronRight size={24} className="text-gray-700" />
        </button>
      </div>

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
            />
          )
        )}
      </div>
    </section>
  );
}

export default ProductRowSlider;