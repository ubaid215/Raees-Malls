import React, { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowRight } from 'lucide-react';
import { debounce } from 'lodash';
import ProductCard from './ProductCard';
import Button from '../core/Button';
import LoadingSpinner from '../core/LoadingSpinner';
import { ProductContext } from '../../context/ProductContext';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../shared/config';
import SocketService from '../../services/socketService';
import { toast } from 'react-toastify';

function FeaturedProducts() {
  const { products, loading: productsLoading, error: productsError, fetchFeaturedProducts } = useContext(ProductContext);
  const [isInitialized, setIsInitialized] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  const mountCount = useRef(0);
  const fetchInProgressRef = useRef(false);
  const lastFetchParamsRef = useRef('');
  const componentKey = 'featured-products';

  // Log component mounts for debugging
  useEffect(() => {
    mountCount.current += 1;
    if (process.env.NODE_ENV === 'development') {
      console.log(`FeaturedProducts[${componentKey}] mounted ${mountCount.current} times`);
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`FeaturedProducts[${componentKey}] unmounted`);
      }
    };
  }, []);

  // Memoize processed products with stable reference
  const memoizedProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }

    const featuredProducts = products
      .filter(product => product?.isFeatured === true && product?.stock > 0)
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
      }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 6); // Limit to 6 featured products

    if (process.env.NODE_ENV === 'development') {
      console.log(`FeaturedProducts[${componentKey}] - Processed ${featuredProducts.length} featured products`);
    }

    return featuredProducts;
  }, [products]);

  // Optimized fetch handler with deduplication
  const handleFetchFeaturedProducts = useCallback(
    debounce(async (forceRefresh = false) => {
      const params = { page: 1, limit: 6, sort: '-createdAt' };
      const paramsKey = JSON.stringify(params);

      // Prevent duplicate API calls
      if (fetchInProgressRef.current && !forceRefresh) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`FeaturedProducts[${componentKey}] - Fetch already in progress, skipping`);
        }
        return;
      }

      // Prevent identical consecutive calls
      if (lastFetchParamsRef.current === paramsKey && !forceRefresh) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`FeaturedProducts[${componentKey}] - Identical params, skipping fetch`);
        }
        return;
      }

      fetchInProgressRef.current = true;
      lastFetchParamsRef.current = paramsKey;

      try {
        setLocalError(null);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`FeaturedProducts[${componentKey}] - Fetching featured products with params:`, params);
        }

        const result = await fetchFeaturedProducts(
          params,
          { skipCache: forceRefresh }
        );

        if (process.env.NODE_ENV === 'development') {
          console.log(`FeaturedProducts[${componentKey}] - API Response:`, result);
        }
      } catch (err) {
        console.error(`FeaturedProducts[${componentKey}] - Fetch error:`, err);
        setLocalError(err.message || 'Failed to load featured products');
        toast.error(err.message || 'Failed to load featured products');
      } finally {
        fetchInProgressRef.current = false;
      }
    }, 500),
    [fetchFeaturedProducts]
  );

  // Single initialization effect
  useEffect(() => {
    let mounted = true;

    const initializeComponent = async () => {
      // Skip if already initialized
      if (isInitialized) {
        return;
      }

      // Skip if we're in the middle of loading or fetching
      if (productsLoading || fetchInProgressRef.current) {
        return;
      }

      // Check if we already have featured products
      const hasFeaturedProducts = products && products.some(p => p?.isFeatured === true);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`FeaturedProducts[${componentKey}] - Initializing component`, {
          hasFeaturedProducts,
          productsLength: products?.length || 0,
          memoizedLength: memoizedProducts.length
        });
      }

      // Only fetch if we don't have featured products or if we have very few
      if (!hasFeaturedProducts || memoizedProducts.length === 0) {
        await handleFetchFeaturedProducts();
      }

      if (mounted) {
        setIsInitialized(true);
      }
    };

    initializeComponent();

    return () => {
      mounted = false;
    };
  }, [isInitialized, productsLoading, products, memoizedProducts.length, handleFetchFeaturedProducts]);

  // Optimized socket handling
  useEffect(() => {
    if (!isInitialized) return;

    let mounted = true;

    const connectSocket = () => {
      if (isSocketConnected) return;

      try {
        SocketService.connect();
        if (mounted) {
          setIsSocketConnected(true);
          if (process.env.NODE_ENV === 'development') {
            console.log(`FeaturedProducts[${componentKey}] - SocketService connected`);
          }
        }
      } catch (err) {
        console.error(`FeaturedProducts[${componentKey}] - SocketService connection error:`, err);
        setLocalError('Failed to initialize real-time updates');
        toast.error('Failed to initialize real-time updates');
      }
    };

    // Debounced handlers to prevent excessive API calls
    const debouncedProductCreated = debounce((data) => {
      if (!mounted) return;
      
      if (data.product?.isFeatured && data.product?.stock > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`FeaturedProducts[${componentKey}] - New featured product created:`, data.product.title);
        }
        handleFetchFeaturedProducts(true);
        toast.success(`New featured product added: ${data.product.title}`);
      }
    }, 1000);

    const debouncedProductUpdated = debounce((data) => {
      if (!mounted) return;
      
      // Check if this affects featured products (either was featured or is now featured)
      const wasOrIsFeatured = data.product?.isFeatured || data.previousData?.isFeatured;
      
      if (wasOrIsFeatured) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`FeaturedProducts[${componentKey}] - Featured product updated:`, data.product?.title);
        }
        handleFetchFeaturedProducts(true);
        
        if (data.product?.isFeatured) {
          toast.info(`Featured product updated: ${data.product.title}`);
        }
      }
    }, 1000);

    const debouncedProductDeleted = debounce((data) => {
      if (!mounted) return;
      
      // Always refresh on delete as we don't know if it was featured
      if (process.env.NODE_ENV === 'development') {
        console.log(`FeaturedProducts[${componentKey}] - Product deleted, refreshing featured products`);
      }
      handleFetchFeaturedProducts(true);
      toast.warn('Product removed');
    }, 1000);

    connectSocket();

    SocketService.on('productCreated', debouncedProductCreated);
    SocketService.on('productUpdated', debouncedProductUpdated);
    SocketService.on('productDeleted', debouncedProductDeleted);

    return () => {
      mounted = false;
      debouncedProductCreated.cancel();
      debouncedProductUpdated.cancel();
      debouncedProductDeleted.cancel();
      
      SocketService.off('productCreated');
      SocketService.off('productUpdated');
      SocketService.off('productDeleted');
      
      if (isSocketConnected) {
        SocketService.disconnect();
        setIsSocketConnected(false);
        if (process.env.NODE_ENV === 'development') {
          console.log(`FeaturedProducts[${componentKey}] - SocketService disconnected`);
        }
      }
    };
  }, [isInitialized, handleFetchFeaturedProducts, isSocketConnected]);

  // Manual retry function
  const handleRetry = useCallback(() => {
    setLocalError(null);
    setIsInitialized(false);
    lastFetchParamsRef.current = '';
    handleFetchFeaturedProducts(true);
  }, [handleFetchFeaturedProducts]);

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    setLocalError(null);
    handleFetchFeaturedProducts(true);
  }, [handleFetchFeaturedProducts]);

  const isLoading = !isInitialized || (productsLoading && memoizedProducts.length === 0);
  const hasError = localError || productsError;

  if (isLoading) {
    return (
      <section aria-label="Loading Featured Products" className="w-full px-4 sm:px-6 my-6 sm:my-8 pb-5 text-center">
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (hasError && memoizedProducts.length === 0) {
    return (
      <section aria-label="Featured Products Error" className="w-full px-4 sm:px-6 my-6 sm:my-8 pb-5 text-center">
        <p className="text-base sm:text-lg text-gray-500 mb-4">
          Failed to load featured products: {hasError}
        </p>
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={handleRetry}
            variant="outline"
            disabled={productsLoading || fetchInProgressRef.current}
          >
            {productsLoading || fetchInProgressRef.current ? 'Loading...' : 'Retry Now'}
          </Button>
          <Link to="/products" className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors">
            View All Products <ArrowRight size={16} className="sm:size-18" />
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-xs text-gray-400">
            <p>Total products: {products?.length || 0}</p>
            <p>Featured products: {memoizedProducts.length}</p>
            <p>Is initialized: {isInitialized.toString()}</p>
            <p>Fetch in progress: {fetchInProgressRef.current.toString()}</p>
            <p>Socket connected: {isSocketConnected.toString()}</p>
          </div>
        )}
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
        <nav>
          <Link
            to="/products"
            className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base text-red-500 hover:text-red-800 transition-colors"
          >
            View All <ArrowRight size={16} />
          </Link>
        </nav>
      </div>

      <div className="w-full">
        {memoizedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {memoizedProducts.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-10">
            <p className="text-gray-500 text-sm sm:text-base">No featured products available</p>
            <Button
              onClick={handleRefresh}
              className="mt-3 sm:mt-4 text-sm"
              disabled={productsLoading || fetchInProgressRef.current}
            >
              {productsLoading || fetchInProgressRef.current ? 'Loading...' : 'Refresh Products'}
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 text-xs text-gray-400">
                <p>Total products: {products?.length || 0}</p>
                <p>Products with isFeatured=true: {products?.filter(p => p?.isFeatured === true).length || 0}</p>
                <p>Products with stock 0: {products?.filter(p => p?.stock > 0).length || 0}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Show error as toast notification if we have products but there's an error */}
        {hasError && memoizedProducts.length > 0 && process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">Warning: {hasError}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default FeaturedProducts;