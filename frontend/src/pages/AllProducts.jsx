import React, { useState, useCallback, useEffect, useMemo, useContext, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/core/Button';
import LoadingSkeleton from '../components/shared/LoadingSkelaton';
import { toast } from 'react-toastify';
import { CategoryContext } from '../context/CategoryContext';
import { ProductContext } from '../context/ProductContext';
import ProductCard from '../components/Products/ProductCard';
import { API_BASE_URL } from '../components/shared/config';
import { debounce } from 'lodash';
import SocketService from '../services/socketService';
import { isInStock } from '../services/productService';

function AllProducts() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 24,
    pages: 1,
    total: 0,
  });
  const [forceUpdate, setForceUpdate] = useState(0); // New force update trigger
  const navigate = useNavigate();
  const location = useLocation();
  const { categories, fetchCategories } = useContext(CategoryContext);
  const { products, loading, error, fetchProducts } = useContext(ProductContext);
  const dropdownRef = useRef(null);
  const productsRef = useRef(products); // Ref to track current products

  // Update ref when products change
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Create a hierarchical structure for categories
  const categoriesWithSubcategories = useMemo(() => {
    const categoryMap = {};
    categories.forEach(category => {
      categoryMap[category._id] = { ...category, subCategories: [] };
    });

    const rootCategories = [];
    categories.forEach(category => {
      const parentId = category.parentId?._id || category.parentId;
      if (parentId && categoryMap[parentId]) {
        categoryMap[parentId].subCategories.push(categoryMap[category._id]);
      } else {
        rootCategories.push(categoryMap[category._id]);
      }
    });

    rootCategories.sort((a, b) => a.name.localeCompare(b.name));
    rootCategories.forEach(cat => {
      cat.subCategories.sort((a, b) => a.name.localeCompare(b.name));
    });

    return rootCategories;
  }, [categories]);

  const safeCategories = useMemo(() => {
    return [
      { _id: 'all', name: 'All Categories', slug: 'all', subCategories: [] },
      ...categoriesWithSubcategories,
    ];
  }, [categoriesWithSubcategories]);

  // Create a category lookup map for product category names
  const categoryLookup = useMemo(() => {
    const lookup = {};
    const buildLookup = cats => {
      cats.forEach(cat => {
        lookup[cat._id] = cat.name;
        if (cat.subCategories?.length > 0) {
          buildLookup(cat.subCategories);
        }
      });
    };
    buildLookup(safeCategories);
    return lookup;
  }, [safeCategories]);

  const selectedCategoryName = useMemo(() => {
    const findCategoryName = (cats, id) => {
      for (const cat of cats) {
        if (cat._id === id) return cat.name;
        if (cat.subCategories?.length > 0) {
          const found = findCategoryName(cat.subCategories, id);
          if (found) return found;
        }
      }
      return null;
    };
    return findCategoryName(safeCategories, selectedCategory) || 'All Categories';
  }, [selectedCategory, safeCategories]);

  // Handle initial category from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const categorySlug = searchParams.get('category');

    if (categorySlug) {
      const findCategoryBySlug = (cats, slug) => {
        for (const cat of cats) {
          if (cat.slug === slug) return cat._id;
          if (cat.subCategories?.length > 0) {
            const found = findCategoryBySlug(cat.subCategories, slug);
            if (found) return found;
          }
        }
        return null;
      };

      const categoryId = findCategoryBySlug(safeCategories, categorySlug);
      if (categoryId && categoryId !== selectedCategory) {
        setSelectedCategory(categoryId);
        setPagination(prev => ({ ...prev, page: 1 }));
        setForceUpdate(prev => prev + 1); // Force immediate update
      }
    }
  }, [location.search, safeCategories, selectedCategory]);

  // Scroll to top when pagination page changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }, [pagination.page]);

  const fetchProductsWithRetry = useCallback(
    async (page, limit, categoryId, retries = 3) => {
      let attempts = 0;
      while (attempts < retries) {
        try {
          const result = await fetchProducts(
            {
              page,
              limit,
              categoryId: categoryId !== 'all' ? categoryId : null,
              sort: '-createdAt',
            },
            { isPublic: true }
          );

          if (!result || !result.products || typeof result !== 'object') {
            throw new Error('Invalid response from fetchProducts');
          }

          console.log('DEBUG: AllProducts - Fetched Products:', {
            productsCount: result.products.length,
            totalPages: result.totalPages,
            totalItems: result.totalItems,
            stockSummary: result.products.map(p => ({
              id: p._id,
              title: p.title,
              inStock: isInStock(p),
              baseStock: p.stock,
              variantStock: p.variants?.map(v => ({
                storage: v.storageOptions?.map(o => o.stock) || [],
                size: v.sizeOptions?.map(o => o.stock) || [],
              })),
            })),
          });

          setPagination(prev => ({
            ...prev,
            pages: result.totalPages || 1,
            total: result.totalItems || 0,
          }));
          return;
        } catch (err) {
          attempts++;
          console.warn(`DEBUG: AllProducts - Fetch Attempt ${attempts} Failed:`, { error: err.message });
          if (attempts === retries) {
            console.error('DEBUG: AllProducts - Fetch Error:', { error: err.message });
            toast.error(err.message || 'Failed to load products');
            setPagination(prev => ({
              ...prev,
              pages: 1,
              total: 0,
            }));
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    },
    [fetchProducts]
  );

  // Debounced version for user-initiated actions
  const debouncedFetchProducts = useCallback(
    debounce(fetchProductsWithRetry, 300),
    [fetchProductsWithRetry]
  );

  // Immediate version for socket events
  const immediateFetchProducts = useCallback(
    () => fetchProductsWithRetry(pagination.page, pagination.limit, selectedCategory),
    [fetchProductsWithRetry, pagination.page, pagination.limit, selectedCategory]
  );

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        await fetchCategories({ isPublic: true });
        await debouncedFetchProducts(pagination.page, pagination.limit, selectedCategory);
      } catch (err) {
        console.error('DEBUG: AllProducts - Initial Fetch Error:', { error: err.message });
        toast.error('Failed to load initial data. Please try again.');
      }
    };

    fetchInitialData();
  }, [fetchCategories, debouncedFetchProducts, pagination.page, pagination.limit, selectedCategory]);

  // Socket.IO integration with optimistic updates
  useEffect(() => {
    const handleProductCreated = data => {
      console.log('DEBUG: AllProducts - Socket Product Created:', {
        productId: data.product._id,
        title: data.product.title,
        inStock: isInStock(data.product),
        baseStock: data.product.stock,
        variantStock: data.product.variants?.map(v => ({
          storage: v.storageOptions?.map(o => o.stock) || [],
          size: v.sizeOptions?.map(o => o.stock) || [],
        })),
      });
      
      // Optimistically update if the product belongs to current category
      if (selectedCategory === 'all' || data.product.categoryId === selectedCategory) {
        immediateFetchProducts();
      }
    };

    const handleProductUpdated = data => {
      console.log('DEBUG: AllProducts - Socket Product Updated:', {
        productId: data.product._id,
        title: data.product.title,
        inStock: isInStock(data.product),
        baseStock: data.product.stock,
        variantStock: data.product.variants?.map(v => ({
          storage: v.storageOptions?.map(o => o.stock) || [],
          size: v.sizeOptions?.map(o => o.stock) || [],
        })),
      });
      
      // Immediate update if the product belongs to current category
      if (selectedCategory === 'all' || data.product.categoryId === selectedCategory) {
        immediateFetchProducts();
      }
    };

    const handleProductDeleted = data => {
      console.log('DEBUG: AllProducts - Socket Product Deleted:', {
        productId: data.productId,
      });
      
      // Optimistically remove the product from the list
      immediateFetchProducts();
    };

    const handleCategoryUpdated = ({ category }) => {
      console.log('DEBUG: AllProducts - Socket Category Updated:', { categoryId: category._id });
      if (selectedCategory !== 'all' && category._id === selectedCategory) {
        immediateFetchProducts();
      }
    };

    const handleCategoryDeleted = ({ categoryIds }) => {
      console.log('DEBUG: AllProducts - Socket Category Deleted:', { categoryIds });
      if (categoryIds.includes(selectedCategory)) {
        setSelectedCategory('all');
      }
      immediateFetchProducts();
    };

    SocketService.on('productCreated', handleProductCreated);
    SocketService.on('productUpdated', handleProductUpdated);
    SocketService.on('productDeleted', handleProductDeleted);
    SocketService.on('categoryUpdated', handleCategoryUpdated);
    SocketService.on('categoryDeleted', handleCategoryDeleted);

    return () => {
      SocketService.off('productCreated', handleProductCreated);
      SocketService.off('productUpdated', handleProductUpdated);
      SocketService.off('productDeleted', handleProductDeleted);
      SocketService.off('categoryUpdated', handleCategoryUpdated);
      SocketService.off('categoryDeleted', handleCategoryDeleted);
    };
  }, [selectedCategory, immediateFetchProducts]);

  // Fetch products when needed
  useEffect(() => {
    debouncedFetchProducts(pagination.page, pagination.limit, selectedCategory);
  }, [pagination.page, selectedCategory, forceUpdate, debouncedFetchProducts]);

  const handlePageChange = newPage => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleCategoryChange = categoryId => {
    const findCategoryById = (cats, id) => {
      for (const cat of cats) {
        if (cat._id === id) return cat;
        if (cat.subCategories?.length > 0) {
          const found = findCategoryById(cat.subCategories, id);
          if (found) return found;
        }
      }
      return null;
    };

    const category = findCategoryById(safeCategories, categoryId);
    const slug = category?.slug || '';

    navigate(`?category=${slug}`, { replace: true });

    setSelectedCategory(categoryId);
    setPagination(prev => ({ ...prev, page: 1 }));
    setForceUpdate(prev => prev + 1); 
    setIsCategoryDropdownOpen(false);
  };


  const toggleCategoryDropdown = e => {
    e.stopPropagation();
    setIsCategoryDropdownOpen(prev => !prev);
  };

  const toggleSubcategory = categoryId => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        console.log('DEBUG: AllProducts - Clicked Outside Dropdown:', { target: event.target });
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  const memoizedProducts = useMemo(() => {
    const productArray = Array.isArray(products) ? products : [];
    const normalizedProducts = productArray.map(product => ({
      ...product,
      title: product.title || 'Untitled Product',
      images: Array.isArray(product.images)
        ? product.images.map(img => ({
            url: img.url?.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`,
            alt: img.alt || product.title || 'Product image',
          }))
        : [{ url: '/placeholder-product.png', alt: 'Placeholder image' }],
      categoryId: {
        _id: product.categoryId?._id || product.categoryId,
        name: categoryLookup[product.categoryId?._id || product.categoryId] || 'Uncategorized',
      },
    }));

    console.log('DEBUG: AllProducts - Memoized Products:', {
      productsCount: normalizedProducts.length,
      stockSummary: normalizedProducts.map(p => ({
        id: p._id,
        title: p.title,
        inStock: isInStock(p),
        baseStock: p.stock,
        displayPrice: p.displayPrice,
        variantStock: p.variants?.map(v => ({
          storage: v.storageOptions?.map(o => o.stock) || [],
          size: v.sizeOptions?.map(o => o.stock) || [],
        })),
      })),
    });

    return normalizedProducts;
  }, [products, categoryLookup]);

  // Render category for desktop sidebar
  const renderCategory = (category, level = 0) => {
    const hasSubcategories = category.subCategories?.length > 0;
    const isExpanded = expandedCategories[category._id];
    const isSelected = selectedCategory === category._id;

    return (
      <li key={category._id} className="relative">
        <button
          onClick={() =>
            hasSubcategories ? toggleSubcategory(category._id) : handleCategoryChange(category._id)
          }
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm sm:text-base transition-colors ${
            isSelected ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          type="button"
        >
          <span>{category.name}</span>
          {hasSubcategories && (
            <svg
              className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
        {hasSubcategories && isExpanded && (
          <ul className="mt-1 space-y-1">
            {category.subCategories.map(subCategory => renderCategory(subCategory, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  // Render category for mobile dropdown
  const renderMobileCategory = (category, level = 0) => {
    const hasSubcategories = category.subCategories?.length > 0;
    const isExpanded = expandedCategories[category._id];
    const isSelected = selectedCategory === category._id;

    return (
      <React.Fragment key={category._id}>
        <li className="relative">
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              if (hasSubcategories) {
                toggleSubcategory(category._id);
              } else {
                handleCategoryChange(category._id);
              }
            }}
            className={`w-full flex items-center justify-between px-4 py-4 text-sm transition-colors ${
              isSelected ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
            style={{ paddingLeft: `${level * 12 + 16}px` }}
            role="menuitem"
            aria-selected={isSelected}
            type="button"
          >
            <span>{category.name}</span>
            {hasSubcategories && (
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </li>
        {hasSubcategories && isExpanded && (
          <>
            {category.subCategories.map(subCategory => renderMobileCategory(subCategory, level + 1))}
          </>
        )}
      </React.Fragment>
    );
  };

  if (loading && memoizedProducts.length === 0) {
    return (
      <section className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSkeleton type="text" width="64" height="8" className="mb-8 mx-auto" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4">
                <LoadingSkeleton type="image" width="full" height="48" className="mb-4" />
                <LoadingSkeleton type="text" width="80" height="5" className="mb-2" />
                <LoadingSkeleton type="text" width="60" height="4" className="mb-2" />
                <LoadingSkeleton type="text" width="40" height="4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Shop | Raees Malls</title>
        <meta name="description" content="Browse our full collection of products" />
      </Helmet>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-4">
          Our Products
          {selectedCategory !== 'all' && (
            <span className="text-lg font-normal block mt-2 text-gray-600">
              Category: {selectedCategoryName}
            </span>
          )}
        </h1>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}.{' '}
                  <button
                    onClick={() => {
                      setNeedsFetch(true);
                      fetchCategories({ isPublic: true });
                    }}
                    className="font-medium text-red-700 hover:text-red-600 underline"
                    type="button"
                  >
                    Try again
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mobile Category Dropdown */}
          <div className="lg:hidden w-full mb-3">
            <div className="relative" id="category-dropdown" ref={dropdownRef}>
              <button
                onClick={toggleCategoryDropdown}
                className="flex justify-between items-center w-full bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3 text-left"
                type="button"
                aria-expanded={isCategoryDropdownOpen}
              >
                <span className="font-medium text-gray-900">{selectedCategoryName}</span>
                <svg
                  className={`h-5 w-5 text-gray-500 transition-transform ${isCategoryDropdownOpen ? 'transform rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {isCategoryDropdownOpen && (
                <div className="mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 py-1 max-h-60 max-w-full overflow-auto pointer-events-auto touch-action-manipulation z-[100]">
                  {categories.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 mb-2">No categories loaded.</p>
                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          fetchCategories({ isPublic: true });
                        }}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                        type="button"
                      >
                        Load Categories
                      </Button>
                    </div>
                  ) : (
                    <ul role="menu">
                      {safeCategories.map(category => renderMobileCategory(category))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Category Sidebar */}
          <nav className="hidden lg:block w-64 bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:sticky lg:top-4 h-fit">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Categories</h2>
            {categories.length === 0 ? (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">No categories loaded.</p>
                <Button
                  onClick={() => fetchCategories({ isPublic: true })}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  type="button"
                >
                  Load Categories
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {safeCategories.map(category => renderCategory(category))}
              </ul>
            )}
          </nav>

          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <p className="text-sm text-gray-600">
                Showing{' '}
                {memoizedProducts.length > 0
                  ? `${(pagination.page - 1) * pagination.limit + 1}-${Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )} of ${pagination.total}`
                  : '0'}{' '}
                products
              </p>
            </div>

            {memoizedProducts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedCategory === 'all'
                    ? 'Click below to load products or try a different category.'
                    : 'No products found in this category. Try another category or view all products.'}
                </p>
                <div className="mt-6 flex flex-col gap-4">
                  <Button
                    onClick={() => setNeedsFetch(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                    type="button"
                  >
                    Refresh Products
                  </Button>
                  {selectedCategory !== 'all' && (
                    <Button
                      onClick={() => handleCategoryChange('all')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      type="button"
                    >
                      View All Products
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {memoizedProducts.map(product => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between w-full mt-6">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-5 h-5 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      <span className="hidden sm:inline">Previous</span>
                    </button>

                    <div className="flex items-center space-x-1 mx-2 overflow-x-auto">
                      {pagination.page > 3 && pagination.pages > 5 && (
                        <>
                          <button
                            onClick={() => handlePageChange(1)}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100"
                          >
                            1
                          </button>
                          {pagination.page > 4 && <span className="px-1">...</span>}
                        </>
                      )}

                      {Array.from(
                        { length: Math.min(5, pagination.pages) },
                        (_, i) => {
                          const pageNum =
                            pagination.page <= 3
                              ? i + 1
                              : pagination.page >= pagination.pages - 2
                              ? pagination.pages - 4 + i
                              : pagination.page - 2 + i;

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                pagination.page === pageNum
                                  ? 'bg-red-600 text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}

                      {pagination.page < pagination.pages - 2 && pagination.pages > 5 && (
                        <>
                          {pagination.page < pagination.pages - 3 && (
                            <span className="px-1">...</span>
                          )}
                          <button
                            onClick={() => handlePageChange(pagination.pages)}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100"
                          >
                            {pagination.pages}
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <svg
                        className="w-5 h-5 ml-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AllProducts;