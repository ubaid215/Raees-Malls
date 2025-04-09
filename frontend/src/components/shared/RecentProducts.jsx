import React, { useState, useRef, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import ProductCard from '../features/ProductCard'; 
import Button from '../core/Button'; 
import { getProducts } from '../../services/productAPI'; 
import axios from 'axios';

const RecentProducts = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sliderRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const BASE_URL = 'http://localhost:5000';

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/categories`);
        if (response.data.success) {
          setCategories([{ id: 'all', name: 'All' }, ...response.data.data]);
        } else {
          throw new Error('Failed to fetch categories');
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchCategories();
  }, []);

  // Fetch recent products
  useEffect(() => {
    const fetchRecentProducts = async () => {
      try {
        setLoading(true);
        const { data } = await getProducts({
          page: 1,
          limit: 12,
          sort: '-createdAt',
        });
        const formattedProducts = data.map(product => ({
          ...product,
          id: product._id,
          images: product.images.map(img => `${BASE_URL}${img}`),
          categories: product.categories || [],
        }));
        setProducts(formattedProducts);
        setFilteredProducts(formattedProducts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentProducts();
  }, []);

  // Filter products by active category
  useEffect(() => {
    if (activeCategory === 'all') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(
        products.filter((product) =>
          product.categories.some((cat) => cat._id === activeCategory)
        )
      );
    }
    if (sliderRef.current) {
      sliderRef.current.scrollLeft = 0;
    }
    setTimeout(checkScrollPosition, 100);
  }, [activeCategory, products]);

  // Check scroll position for arrow visibility
  const checkScrollPosition = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Handle scroll events
  useEffect(() => {
    const slider = sliderRef.current;
    if (slider) {
      slider.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
      return () => slider.removeEventListener('scroll', checkScrollPosition);
    }
  }, [filteredProducts]);

  // Scroll functions
  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: -300,
        behavior: 'smooth',
      });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: 300,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="flex gap-6 overflow-hidden">
          {Array(4).fill().map((_, index) => (
            <div key={index} className="flex-shrink-0 w-[280px] h-[380px] bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-red-600">
        Error loading recent products: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with title and category buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recent Products</h2>
          <p className="text-gray-600">Newly added items in our collection</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'primary' : 'outline'}
              size="small"
              onClick={() => setActiveCategory(category.id)}
              className="whitespace-nowrap"
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Products slider */}
      <div className="relative">
        {showLeftArrow && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-md p-2 hover:bg-gray-100 transition-colors"
            aria-label="Scroll left"
          >
            <FiChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        )}

        <div
          ref={sliderRef}
          className="flex gap-6 overflow-x-auto scroll-smooth scrollbar-hide pb-4"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory'
          }}
        >
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <div 
                key={product.id} 
                className="flex-shrink-0 w-[280px] snap-start"
              >
                <ProductCard product={product} buttonBelowPrice />
              </div>
            ))
          ) : (
            <div className="w-full py-12 text-center text-gray-500">
              No recent products found in this category
            </div>
          )}
        </div>

        {showRightArrow && filteredProducts.length > 0 && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-md p-2 hover:bg-gray-100 transition-colors"
            aria-label="Scroll right"
          >
            <FiChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        )}
      </div>
    </div>
  );
};

export default RecentProducts;