import React, { useState, useCallback, useMemo, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Button from '../components/core/Button';
import LoadingSkeleton from '../components/shared/LoadingSkelaton';
import { toast } from 'react-toastify';
import { CategoryContext } from '../context/CategoryContext';
import { ProductContext } from '../context/ProductContext';
import ProductCard from '../components/Products/ProductCard';
import { API_BASE_URL } from '../components/shared/config';

function AllProducts() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    pages: 1,
    total: 0
  });
  const [needsFetch, setNeedsFetch] = useState(true); // Tracks if fetch is needed
  const navigate = useNavigate();
  const { categories, fetchCategories } = useContext(CategoryContext);
  const { products, loading, error, fetchProducts } = useContext(ProductContext);

  const safeCategories = categories.length > 0
    ? [{ _id: 'all', name: 'All Categories', slug: 'all' }, ...categories]
    : [{ _id: 'all', name: 'All Categories', slug: 'all' }];

  const handleFetchCategories = async () => {
    try {
      await fetchCategories({ isPublic: true });
    } catch (err) {
      console.error("Category fetch error:", err);
      toast.error(err.message || 'Failed to fetch categories');
    }
  };

  const handleFetchProducts = useCallback(async () => {
    try {
      await fetchProducts(
        pagination.page,
        pagination.limit,
        selectedCategory !== 'all' ? selectedCategory : null,
        false,
        { isPublic: true }
      );
      setNeedsFetch(false);
      setPagination(prev => ({
        ...prev,
        pages: Math.ceil(products.length / pagination.limit) || 1,
        total: products.length
      }));
    } catch (err) {
      console.error("Product fetch error:", err);
      toast.error(err.message || 'Failed to load products');
    }
  }, [fetchProducts, pagination.page, pagination.limit, selectedCategory, products.length]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      setNeedsFetch(true); // Require manual fetch after page change
    }
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setPagination(prev => ({ ...prev, page: 1 }));
    setNeedsFetch(true); // Require manual fetch after category change
  };

  const memoizedProducts = useMemo(() => {
    return products.map((product) => ({
      _id: product._id,
      title: product.name || product.title || 'Untitled Product',
      price: product.price || 0,
      images: product.images?.map((img) => ({
        url: img.url?.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`,
      })) || [{ url: '/placeholder-product.png' }],
      sku: product.sku || 'N/A',
      rating: product.rating ? parseFloat(product.rating) : 0,
      numReviews: product.numReviews || 0,
      stock: product.stock || 0,
      categories: product.categories || [],
    }));
  }, [products]);

  if (loading && products.length === 0) {
    return (
      <section aria-label="Loading All Products" className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
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
    <section aria-label="All Products" className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>All Products | Your Store</title>
        <meta name="description" content="Browse our full collection of products across various categories with exclusive deals." />
      </Helmet>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8">
          Our Products
          {selectedCategory !== 'all' && categories.length > 0 && (
            <span className="text-lg font-normal block mt-2 text-gray-600">
              Category: {categories.find(c => c._id === selectedCategory)?.name}
            </span>
          )}
        </h1>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}. {' '}
                  <button
                    onClick={() => {
                      handleFetchCategories();
                      handleFetchProducts();
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
                  onClick={handleFetchCategories}
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
                Showing {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
              </p>
            </div>

            {products.length === 0 || needsFetch ? (
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
                <h3 className="mt-2 text-lg font-medium text-gray-900">No products loaded</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedCategory === 'all'
                    ? 'Click below to load products or reset the category.'
                    : 'Click below to load products for this category or view all products.'}
                </p>
                <div className="mt-6 flex flex-col gap-4">
                  <Button
                    onClick={handleFetchProducts}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                  >
                    Load Products
                  </Button>
                  <Button
                    onClick={() => {
                      handleCategoryChange('all');
                      handleFetchProducts();
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    View All Products
                  </Button>
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
                        const pageNum = pagination.page <= 3
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