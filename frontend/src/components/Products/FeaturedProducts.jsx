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
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

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
    if (!products || !Array.isArray(products)) return [];

    return products
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
  }, [products]);

  const fetchProducts = useCallback(async (forceRefresh = false) => {
    try {
      setIsRefreshing(true);
      setLocalError(null);

      const params = { 
        page: 1, 
        limit: 6, 
        sort: '-createdAt', 
        featured: true, 
        'stock[gt]': 0 
      };

      await fetchFeaturedProducts(params, { skipCache: forceRefresh });
      setLastRefreshTime(Date.now());
    } catch (err) {
      const errorMessage = err.message || 'Failed to load featured products';
      setLocalError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to fetch featured products:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchFeaturedProducts]);

  // Initial load effect
  useEffect(() => {
    fetchProducts(true); // Force refresh on initial load
  }, [fetchProducts]);

  // Auto-refresh effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (!productsLoading && !isRefreshing) {
        fetchProducts(false); // Don't force refresh on auto-update
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [productsLoading, isRefreshing, fetchProducts]);

  const handleRetry = useCallback(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  const isLoading = productsLoading && memoizedProducts.length === 0;
  const hasError = localError || productsError;
  const showProducts = memoizedProducts.length > 0;
  const showEmptyState = !isLoading && !hasError && !showProducts;

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

  return (
    <section aria-label="Featured Products" className="w-full px-4 sm:px-6 my-6 sm:my-8 pb-5">

      <div className="flex sm:flex-row flex-col items-start sm:items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold">Featured Products</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProducts(true)}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Refresh products"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <Link
            to="/products"
            className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base text-red-500 hover:text-red-800 transition-colors"
          >
            View All <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {hasError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            {showProducts ? 'Some products may not be up to date. ' : 'Failed to load products. '}
            <button 
              onClick={handleRetry}
              className="underline hover:no-underline"
            >
              {showProducts ? 'Refresh now' : 'Try again'}
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
            <Button
              onClick={handleRetry}
              disabled={isRefreshing}
              className="flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Loading...' : 'Check Again'}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default FeaturedProducts;