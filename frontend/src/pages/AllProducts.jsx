import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useCartWishlist } from '../context/CartWishlistContext';
import Button from '../components/core/Button';
import LoadingSkeleton from '../components/shared/LoadingSkelaton';
import { toast } from 'react-toastify';
import { productService } from '../services/productAPI';
import { categoryService } from '../services/categoryAPI';
import { addToCart } from '../services/api';
import ProductCard from '../components/Products/ProductCard';

function AllProducts() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, pages: 1 });
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { addToCart: addToCartContext } = useCartWishlist();

  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoryService.getAllPublicCategories();
      if (response.success) {
        setCategories([{ _id: 'all', name: 'All Categories', slug: 'all' }, ...response.data]);
      } else {
        throw new Error(response.message || 'Failed to fetch categories');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch categories');
      toast.error(err.message || 'Failed to fetch categories');
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productService.getAllPublicProducts({
        page: pagination.page,
        limit: pagination.limit,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      if (response.success) {
        setProducts(response.data);
        setPagination({
          page: pagination.page,
          limit: pagination.limit,
          pages: response.pages || 1,
        });
      } else {
        throw new Error(response.message || 'Failed to load products');
      }
    } catch (err) {
      setError(err.message || 'Failed to load products');
      toast.error(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, pagination.page, pagination.limit]);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchProducts()])
      .catch((err) => {
        setError(err.message || 'Failed to initialize data');
        toast.error(err.message || 'Failed to initialize data');
      });
  }, [fetchCategories, fetchProducts]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  const memoizedProducts = useMemo(() => {
    return products.map((product) => ({
      _id: product._id,
      title: product.title,
      price: product.price,
      images: product.images?.map((img) => ({
        url: img.url?.startsWith('http') ? img.url : `http://localhost:5000${img.url}`,
      })) || [{ url: '/placeholder-product.png' }],
      sku: product.sku || 'N/A',
      rating: product.rating ? parseFloat(product.rating) : 0,
      numReviews: product.numReviews || 0,
      stock: product.stock || 0,
      categories: product.categories || [],
    }));
  }, [products]);

  if (loading) {
    return (
      <section aria-label="Loading All Products" className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
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

  if (error) {
    return (
      <section aria-label="Error Loading All Products" className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-7xl mx-auto">
          <p className="text-lg text-red-600">Error: {error}</p>
          <Button
            onClick={() => {
              setError(null);
              fetchCategories();
              fetchProducts();
            }}
            className="mt-4 border border-red-600 text-red-600 hover:bg-red-50"
          >
            Retry
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="All Products" className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>All Products | Your Store</title>
        <meta name="description" content="Browse our full collection of products across various categories with exclusive deals." />
      </Helmet>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8">
          Our Products
        </h1>
        <div className="flex flex-col lg:flex-row gap-6">
          <nav className="w-full lg:w-64 bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:sticky lg:top-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Categories</h2>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category._id}>
                  <button
                    onClick={() => setSelectedCategory(category._id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm sm:text-base ${
                      selectedCategory === category._id
                        ? 'bg-red-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    aria-label={`Filter by ${category.name}`}
                    aria-current={selectedCategory === category._id ? 'true' : 'false'}
                  >
                    {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex-1">
            {memoizedProducts.length === 0 ? (
              <p className="text-center text-gray-600 text-base sm:text-lg">
                No products found in this category.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {memoizedProducts.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                  <Button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="w-full sm:w-auto border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Previous
                  </Button>
                  <p className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.pages}
                  </p>
                  <Button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="w-full sm:w-auto border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AllProducts;