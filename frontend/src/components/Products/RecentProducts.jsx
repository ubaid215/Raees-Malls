import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import ProductCard from '../Products/ProductCard';
import Button from '../core/Button';
import LoadingSpinner from '../core/LoadingSpinner';
import { productService } from '../../services/productAPI';
import {  categoryService } from '../../services/categoryAPI';

const RecentProducts = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sliderRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories([{ _id: 'all', name: 'All' }, ...response]);
    } catch (err) {
      setError(err.message || 'Failed to fetch categories');
    }
  }, []);

  const fetchRecentProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productService.getProducts({
        page: 1,
        limit: 12,
        sort: '-createdAt',
      });
      setProducts(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load recent products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchRecentProducts()])
      .catch((err) => setError(err.message || 'Failed to initialize data'));
  }, [fetchCategories, fetchRecentProducts]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') {
      return products;
    }
    return products.filter((product) =>
      product.categories.some((cat) => cat._id === activeCategory)
    );
  }, [activeCategory, products]);

  const memoizedProducts = useMemo(() => {
    return filteredProducts.map((product) => ({
      _id: product._id,
      title: product.title,
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      discountPercentage: product.originalPrice && product.originalPrice > product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0,
      images: product.images?.map((img) =>
        img.startsWith('http') ? img : `http://localhost:5000${img}`
      ) || ['/placeholder-product.png'],
      rating: product.rating ? parseFloat(product.rating) : 0,
      numReviews: product.numReviews || 0,
      stock: product.stock || 0,
      categories: product.categories || [],
    }));
  }, [filteredProducts]);

  const checkScrollPosition = useCallback(() => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollLeft = 0;
    }
    setTimeout(checkScrollPosition, 100);
  }, [filteredProducts, checkScrollPosition]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (slider) {
      let timeoutId;
      const debouncedScroll = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(checkScrollPosition, 100);
      };
      slider.addEventListener('scroll', debouncedScroll);
      checkScrollPosition();
      return () => {
        slider.removeEventListener('scroll', debouncedScroll);
        clearTimeout(timeoutId);
      };
    }
  }, [checkScrollPosition]);

  const scrollLeft = useCallback(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: -300,
        behavior: 'smooth',
      });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: 300,
        behavior: 'smooth',
      });
    }
  }, []);

  if (loading) {
    return (
      <section aria-label="Loading Recent Products" className="container mx-auto px-4 py-12">
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Error Loading Recent Products" className="container mx-auto px-4 py-12 text-center">
        <p className="text-lg text-red-600">Error: {error}</p>
        <Button
          onClick={() => {
            fetchCategories();
            fetchRecentProducts();
          }}
          variant="outline"
          className="mt-2"
        >
          Retry
        </Button>
      </section>
    );
  }

  return (
    <section aria-label="Recent Products" className="container mx-auto px-4 py-12">
      <Helmet>
        <title>Recent Products | Your Store</title>
        <meta name="description" content="Discover the latest additions to our store with exclusive discounts and top picks." />
      </Helmet>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Recent Products</h2>
          <p className="text-gray-600">Top picks with special discounts</p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category._id}
              variant={activeCategory === category._id ? 'primary' : 'outline'}
              size="small"
              onClick={() => setActiveCategory(category._id)}
              className="whitespace-nowrap"
            >
              {category.name}
            </Button>
          ))}
        </nav>
      </div>

      <div className="relative">
        {showLeftArrow && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-lg p-2 hover:bg-gray-100 transition-colors"
            aria-label="Scroll left"
          >
            <FiChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
        )}

        <div
          ref={sliderRef}
          className="flex gap-6 overflow-x-auto scroll-smooth scrollbar-hide pb-6"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory',
          }}
        >
          {memoizedProducts.length > 0 ? (
            memoizedProducts.map((product) => (
              <div
                key={product._id}
                className="flex-shrink-0 w-[280px] snap-start"
              >
                <ProductCard product={product} />
              </div>
            ))
          ) : (
            <div className="w-full py-12 text-center text-gray-500">
              No products found in this category
            </div>
          )}
        </div>

        {showRightArrow && memoizedProducts.length > 0 && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-lg p-2 hover:bg-gray-100 transition-colors"
            aria-label="Scroll right"
          >
            <FiChevronRight className="w-6 h-6 text-gray-700" />
          </button>
        )}
      </div>
    </section>
  );
};

export default RecentProducts;