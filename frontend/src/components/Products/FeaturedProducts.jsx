import React, { useContext, useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowRight } from 'lucide-react';
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
  const mountCount = useRef(0);
  const fetchInProgressRef = useRef(false);
  const lastFetchParamsRef = useRef('');
  const hasFetchedRef = useRef(false);
  const componentKey = 'featured-products';

  useEffect(() => {
    mountCount.current += 1;
    if (process.env.NODE_ENV === 'development') {
      // console.log(`FeaturedProducts[${componentKey}] mounted ${mountCount.current} times`);
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        // console.log(`FeaturedProducts[${componentKey}] unmounted`);
      }
    };
  }, []);

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
      if (process.env.NODE_ENV === 'development') {
        // console.log(`FeaturedProducts[${componentKey}] - No products or invalid products array`, { products });
      }
      return [];
    }

    const featuredProducts = products
      .filter(product => {
        const isFeatured = product?.isFeatured === true;
        const hasStock = hasAvailableStock(product);
        if (!isFeatured && process.env.NODE_ENV === 'development') {
          // console.log(`FeaturedProducts[${componentKey}] - Product filtered out (not featured):`, product);
        }
        if (!hasStock && process.env.NODE_ENV === 'development') {
          // console.log(`FeaturedProducts[${componentKey}] - Product filtered out (no stock):`, {
          //   ...product,
          //   variantStock: product.variants?.map(v => ({
          //     color: v.color?.name,
          //     stock: v.stock,
          //     storageOptions: v.storageOptions?.map(o => ({ capacity: o.capacity, stock: o.stock })),
          //     sizeOptions: v.sizeOptions?.map(o => ({ size: o.size, stock: o.stock })),
          //   })),
          // });
        }
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

    if (process.env.NODE_ENV === 'development') {
      // console.log(`FeaturedProducts[${componentKey}] - Processed ${featuredProducts.length} featured products`, featuredProducts);
    }

    return featuredProducts;
  }, [products]);

  const handleFetchFeaturedProducts = useCallback(
    debounce(async (forceRefresh = false) => {
      if (fetchInProgressRef.current && !forceRefresh) {
        if (process.env.NODE_ENV === 'development') {
          // console.log(`FeaturedProducts[${componentKey}] - Fetch already in progress, skipping`);
        }
        return;
      }

      const params = { page: 1, limit: 6, sort: '-createdAt', featured: true, 'stock[gt]': 0 };
      const paramsKey = JSON.stringify(params);

      if (lastFetchParamsRef.current === paramsKey && !forceRefresh && hasFetchedRef.current) {
        if (process.env.NODE_ENV === 'development') {
          // console.log(`FeaturedProducts[${componentKey}] - Identical params and already fetched, skipping`);
        }
        return;
      }

      fetchInProgressRef.current = true;
      lastFetchParamsRef.current = paramsKey;

      try {
        setLocalError(null);
        const response = await fetchFeaturedProducts(params, { skipCache: forceRefresh });
        if (process.env.NODE_ENV === 'development') {
          // console.log(`FeaturedProducts[${componentKey}] - Fetched products:`, response);
        }
        hasFetchedRef.current = true;
      } catch (err) {
        setLocalError(err.message || 'Failed to load featured products');
        toast.error(err.message || 'Failed to load featured products');
      } finally {
        fetchInProgressRef.current = false;
      }
    }, 500),
    [fetchFeaturedProducts]
  );

  useEffect(() => {
    let mounted = true;

    const initializeComponent = async () => {
      if (fetchInProgressRef.current || hasFetchedRef.current) {
        if (process.env.NODE_ENV === 'development') {
          // console.log(`FeaturedProducts[${componentKey}] - Skipping fetch: in progress or already fetched`);
        }
        return;
      }

      if (process.env.NODE_ENV === 'development') {
        // console.log(`FeaturedProducts[${componentKey}] - Initializing component`, {
        //   productsLength: products?.length || 0,
        //   memoizedLength: memoizedProducts.length,
        // });
      }

      await handleFetchFeaturedProducts(true);

      if (mounted) {
        // No state update needed
      }
    };

    initializeComponent();

    return () => {
      mounted = false;
      handleFetchFeaturedProducts.cancel();
    };
  }, [handleFetchFeaturedProducts]);

  const handleRetry = useCallback(() => {
    setLocalError(null);
    lastFetchParamsRef.current = '';
    hasFetchedRef.current = false;
    handleFetchFeaturedProducts(true);
  }, [handleFetchFeaturedProducts]);

  const handleRefresh = useCallback(() => {
    setLocalError(null);
    lastFetchParamsRef.current = '';
    hasFetchedRef.current = false;
    handleFetchFeaturedProducts(true);
  }, [handleFetchFeaturedProducts]);

  const isLoading = productsLoading && memoizedProducts.length === 0;
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
            <p>Products with isFeatured=true: {products?.filter((p) => p?.isFeatured === true).length || 0}</p>
            <p>Products with stock &gt; 0 or variant stock: {products?.filter(p => hasAvailableStock(p)).length || 0}</p>
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
                <p>Products with isFeatured=true: {products?.filter((p) => p?.isFeatured === true).length || 0}</p>
                <p>Products with stock &gt; 0 or variant stock: {products?.filter(p => hasAvailableStock(p)).length || 0}</p>
              </div>
            )}
          </div>
        )}
        
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