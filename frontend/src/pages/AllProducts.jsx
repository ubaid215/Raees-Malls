import React, { useState, useCallback, useEffect, useMemo, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Button from '../components/core/Button';
import LoadingSkeleton from '../components/shared/LoadingSkelaton';
import { toast } from 'react-toastify';
import { CategoryContext } from '../context/CategoryContext';
import { ProductContext } from '../context/ProductContext';
import ProductCard from '../components/Products/ProductCard';
import { API_BASE_URL } from '../components/shared/config';
import { debounce } from 'lodash';
import SocketService from '../services/SocketService';

function AllProducts() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    pages: 1,
    total: 0,
  });
  const [needsFetch, setNeedsFetch] = useState(true);
  const navigate = useNavigate();
  const { categories, fetchCategories } = useContext(CategoryContext);
  const { products, loading, error, fetchProducts } = useContext(ProductContext);

  const safeCategories = categories.length > 0
    ? [{ _id: 'all', name: 'All Categories', slug: 'all' }, ...categories]
    : [{ _id: 'all', name: 'All Categories', slug: 'all' }];

  const debouncedFetchProducts = useCallback(
    debounce(async (page, limit, categoryId) => {
      try {
        const result = await fetchProducts(
          { page, limit, categoryId: categoryId !== 'all' ? categoryId : null, sort: '-createdAt' },
          { isPublic: true, skipCache: true } // Skip cache to avoid stale data
        );

        setPagination((prev) => ({
          ...prev,
          pages: result.totalPages || 1,
          total: result.totalItems || 0,
        }));
        setNeedsFetch(false);
      } catch (err) {
        console.error('Product fetch error:', err);
        toast.error(err.message || 'Failed to load products');
      }
    }, 500),
    [fetchProducts]
  );

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

  // Fetch initial categories
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        await fetchCategories({ isPublic: true });
      } catch (err) {
        console.error('Category fetch error:', err);
        toast.error(err.message || 'Failed to fetch categories');
      }
    };
    fetchInitialData();
  }, [fetchCategories]);

  // Socket.IO integration for real-time updates
  useEffect(() => {
    SocketService.connect();

    const handleProductCreated = (data) => {
      // Only trigger fetch if product matches current category and is in stock
      if (data.product.stock > 0 && 
          (selectedCategory === 'all' || data.product.categoryId === selectedCategory)) {
        setNeedsFetch(true); // Trigger a fetch to refresh the product list
        toast.success(`New product added: ${data.product.title}`);
      }
    };

    const handleProductUpdated = (data) => {
      // Trigger fetch if product is in the current category or was previously displayed
      if (selectedCategory === 'all' || data.product.categoryId === selectedCategory) {
        setNeedsFetch(true); // Trigger a fetch to refresh the product list
        toast.info(`Product updated: ${data.product.title}`);
      }
    };

    const handleProductDeleted = (data) => {
      // Trigger fetch to remove the deleted product
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
  }, [selectedCategory]);

  // Fetch products when needed
  useEffect(() => {
    if (needsFetch) {
      debouncedFetchProducts(pagination.page, pagination.limit, selectedCategory);
    }
  }, [pagination.page, selectedCategory, needsFetch, debouncedFetchProducts]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
      setNeedsFetch(true);
    }
  };

  const handleCategoryChange = useCallback(
    debounce((categoryId) => {
      setSelectedCategory(categoryId);
      setPagination((prev) => ({ ...prev, page: 1 }));
      setNeedsFetch(true);
    }, 300),
    []
  );

  const memoizedProducts = useMemo(() => {
    const productArray = Array.isArray(products) ? products : [];
    return productArray.map((product) => ({
      _id: product._id,
      title: product.name || product.title || 'Untitled Product',
      price: product.price || 0,
      discountPrice: product.discountPrice || 0,
      images: product.images?.map((img) => ({
        url: img.url?.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`,
      })) || [{ url: '/placeholder-product.png' }],
      sku: product.sku || 'N/A',
      rating: product.averageRating || product.rating || 0,
      numReviews: product.numReviews || 0,
      stock: product.stock || 0,
      categories: product.categories || [],
      isFeatured: product.isFeatured || false,
    }));
  }, [products]);

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
        <title>All Products | Your Store</title>
        <meta name="description" content="Browse our full collection of products" />
      </Helmet>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8">
          Our Products
          {selectedCategory !== 'all' && categories.length > 0 && (
            <span className="text-lg font-normal block mt-2 text-gray-600">
              Category: {categories.find((c) => c._id === selectedCategory)?.name}
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
                  >
                    Try again
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <nav className="w-full lg:w-64 bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:sticky lg:top-4 h-fit">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Categories</h2>
            {categories.length === 0 ? (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">No categories loaded.</p>
                <Button
                  onClick={() => fetchCategories({ isPublic: true })}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  Load Categories
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {safeCategories.map((category) => (
                  <li key={category._id}>
                    <button
                      onClick={() => handleCategoryChange(category._id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm sm:text-base transition-colors ${
                        selectedCategory === category._id
                          ? 'bg-red-600 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {category.name}
                    </button>
                  </li>
                ))}
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
                    onClick={() => {
                      setNeedsFetch(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                  >
                    Refresh Products
                  </Button>
                  {selectedCategory !== 'all' && (
                    <Button
                      onClick={() => handleCategoryChange('all')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      View All Products
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {memoizedProducts.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {pagination.pages > 1 && (
                  <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <Button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
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
                      })}
                    </div>

                    <Button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Next
                    </Button>
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