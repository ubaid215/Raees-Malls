import React, { useContext, useEffect, useMemo, useCallback, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { debounce } from 'lodash';
import ProductCard from './ProductCard';
import Button from '../core/Button';
import LoadingSpinner from '../core/LoadingSpinner';
import { ProductContext } from '../../context/ProductContext';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../shared/config';
import { toast } from 'react-toastify';

function FeaturedProducts() {
  const { products, loading: productsLoading, error: productsError, fetchFeaturedProducts } = useContext(ProductContext);
  const [localError, setLocalError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Auto-refresh interval (every 30 seconds)
  const AUTO_REFRESH_INTERVAL = 30000;

  const hasAvailableStock = (product) => {
    if (product.stock > 0) return true;
    if (product.variants?.length > 0) {
      return product.variants.some(variant => {
        if (variant.stock > 0) return true;
        if (variant.storageOptions?.length > 0) {
          return variant.storageOptions.some(option => option.stock > 0);
        }
        if (variant.sizeOptions?.length > 0) {
          return variant.sizeOptions.some(option => option.stock > 0);
        }
        return false;
      });
    }
    return false;
  };

  const memoizedProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }

    const featuredProducts = products
      .filter(product => {
        const isFeatured = product?.isFeatured === true;
        const hasStock = hasAvailableStock(product);
        return isFeatured && hasStock;
      })
      .map(product => ({
        ...product,
        title: product.title || 'Untitled Product',
        images: Array.isArray(product.images)
          ? product.images.map(img => ({
              url: img.url?.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`,
              alt: img.alt || product.title || 'Product image',
            }))
          : [{ url: '/images/placeholder-product.png', alt: 'Placeholder image' }],
        categoryId: {
          _id: product.categoryId?._id || product.categoryId,
          name: product.categoryId?.name || 'Uncategorized',
        },
        createdAt: product.createdAt || new Date().toISOString(),
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);

    return featuredProducts;
  }, [products]);

  // Simplified fetch function
  const fetchProducts = useCallback(async (showRefreshingState = false) => {
    try {
      if (showRefreshingState) setIsRefreshing(true);
      setLocalError(null);

      const params = { 
        page: 1, 
        limit: 6, 
        sort: '-createdAt', 
        featured: true, 
        'stock[gt]': 0 
      };

      await fetchFeaturedProducts(params, { skipCache: true });
      
      if (!hasInitialized) {
        setHasInitialized(true);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to load featured products';
      setLocalError(errorMessage);
      if (showRefreshingState) {
        toast.error(errorMessage);
      }
      console.error('Failed to fetch featured products:', err);
    } finally {
      if (showRefreshingState) setIsRefreshing(false);
    }
  }, [fetchFeaturedProducts, hasInitialized]);

  // Debounced version for auto-refresh
  const debouncedFetch = useCallback(
    debounce(() => fetchProducts(false), 300),
    [fetchProducts]
  );

  // Initial load effect
  useEffect(() => {
    if (!hasInitialized) {
      fetchProducts(true);
    }
  }, [fetchProducts, hasInitialized]);

  // Auto-refresh effect
  useEffect(() => {
    if (!hasInitialized) return;

    const interval = setInterval(() => {
      // Only auto-refresh if no error and not currently loading
      if (!localError && !productsLoading && !isRefreshing) {
        debouncedFetch();
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
      debouncedFetch.cancel();
    };
  }, [hasInitialized, localError, productsLoading, isRefreshing, debouncedFetch]);

  // Retry handler
  const handleRetry = useCallback(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  const isLoading = (productsLoading || !hasInitialized) && memoizedProducts.length === 0;
  const hasError = localError || productsError;
  const showProducts = memoizedProducts.length > 0;
  const showEmptyState = hasInitialized && !isLoading && !hasError && !showProducts;

  // Loading state
  if (isLoading) {
    return (
      <section aria-label="Loading Featured Products" className="w-full px-4 sm:px-6 my-6 sm:my-8 pb-5">
        <div className="flex sm:flex-row flex-col items-start sm:items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold">Featured Products</h1>
        </div>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  // Error state (only when no products to show)
  if (hasError && !showProducts) {
    return (
      <section aria-label="Featured Products Error" className="w-full px-4 sm:px-6 my-6 sm:my-8 pb-5">
        <div className="flex sm:flex-row flex-col items-start sm:items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold">Featured Products</h1>
        </div>
        <div className="text-center py-8">
          <p className="text-base sm:text-lg text-gray-500 mb-4">
            Unable to load featured products
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleRetry}
              variant="outline"
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Loading...' : 'Try Again'}
            </Button>
            <Link 
              to="/products" 
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              View All Products <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Featured Products" className="w-full px-4 sm:px-6 my-6 sm:my-8 pb-5">
      <Helmet>
        <title>Featured Products | Raees Malls</title>
        <meta name="description" content="Explore our handpicked selection of featured products with exclusive discounts and limited stock." />
      </Helmet>

      <div className="flex sm:flex-row flex-col items-start sm:items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold">Featured Products</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Refresh products"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <nav>
            <Link
              to="/products"
              className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base text-red-500 hover:text-red-800 transition-colors"
            >
              View All <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </div>

      {/* Error banner (when products are showing but there's a background error) */}
      {hasError && showProducts && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Some products may not be up to date. 
            <button 
              onClick={handleRetry}
              className="ml-2 underline hover:no-underline"
            >
              Refresh now
            </button>
          </p>
        </div>
      )}

      <div className="w-full">
        {showProducts ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {memoizedProducts.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : showEmptyState ? (
          <div className="text-center py-8 sm:py-10">
            <p className="text-gray-500 text-sm sm:text-base mb-4">
              No featured products available at the moment
            </p>
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Loading...' : 'Check Again'}
              </Button>
              <Link 
                to="/products" 
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                Browse All Products <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {/* Auto-refresh indicator */}
      {hasInitialized && !isLoading && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Products auto-refresh every 30 seconds
          </p>
        </div>
      )}
    </section>
  );
}

export default FeaturedProducts;