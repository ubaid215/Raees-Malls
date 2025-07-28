import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { debounce } from 'lodash';
import { ProductContext } from '../../context/ProductContext';
import ProductCard from './ProductCard';
import Button from '../core/Button';
import LoadingSpinner from '../core/LoadingSpinner';
import { API_BASE_URL } from '../shared/config';
import SocketService from '../../services/socketService';
import { toast } from 'react-toastify';

function ProductRowSlider({ title, isFeatured = false, categoryId = '' }) {
  const { products, loading, error, fetchProducts } = useContext(ProductContext);
  const [localProducts, setLocalProducts] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  const mountCount = useRef(0);
  const fetchInProgressRef = useRef(false);
  const lastFetchParamsRef = useRef('');

  // Generate unique key for this component instance
  const componentKey = useMemo(() => 
    `${isFeatured ? 'featured' : 'regular'}-${categoryId || 'all'}`, 
    [isFeatured, categoryId]
  );

  // Log component mounts for debugging
  useEffect(() => {
    mountCount.current += 1;
    if (process.env.NODE_ENV === 'development') {
      console.log(`ProductRowSlider[${componentKey}] mounted ${mountCount.current} times`);
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`ProductRowSlider[${componentKey}] unmounted`);
      }
    };
  }, [componentKey]);

  // Memoized products with stable reference
  const memoizedProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }

    const filteredProducts = products.filter(product => {
      const featuredMatch = isFeatured ? product.isFeatured : !product.isFeatured;
      const categoryMatch = categoryId ? 
        (product.categoryId?._id === categoryId || product.categoryId === categoryId) : true;
      const stockMatch = product.stock > 0;
      return featuredMatch && categoryMatch && stockMatch;
    });

    const processedProducts = filteredProducts.map(product => ({
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
    }));

    return processedProducts
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 16);
  }, [products, isFeatured, categoryId]);

  // Optimized fetch products with deduplication
  const handleFetchProducts = useCallback(
    debounce(async (forceRefresh = false) => {
      const params = {
        page: 1,
        limit: 50,
        sort: '-createdAt',
        ...(categoryId ? { categoryId } : {}),
      };

      const paramsKey = JSON.stringify(params);
      
      // Prevent duplicate API calls
      if (fetchInProgressRef.current && !forceRefresh) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`ProductRowSlider[${componentKey}] - Fetch already in progress, skipping`);
        }
        return;
      }

      // Prevent identical consecutive calls
      if (lastFetchParamsRef.current === paramsKey && !forceRefresh) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`ProductRowSlider[${componentKey}] - Identical params, skipping fetch`);
        }
        return;
      }

      fetchInProgressRef.current = true;
      lastFetchParamsRef.current = paramsKey;

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`ProductRowSlider[${componentKey}] - Fetching products with params:`, params);
        }

        const result = await fetchProducts(params, { 
          isPublic: true, 
          skipCache: forceRefresh 
        });

        if (process.env.NODE_ENV === 'development') {
          console.log(`ProductRowSlider[${componentKey}] - API Response:`, result);
        }
      } catch (err) {
        console.error(`ProductRowSlider[${componentKey}] - Fetch error:`, err);
        toast.error(err.message || 'Failed to load products');
      } finally {
        fetchInProgressRef.current = false;
      }
    }, 500),
    [fetchProducts, categoryId, componentKey]
  );

  // Single initialization effect
  useEffect(() => {
    let mounted = true;

    const initializeComponent = async () => {
      // Skip if already initialized or if products are already available
      if (hasInitialized || memoizedProducts.length > 0) {
        return;
      }

      // Skip if we're in the middle of loading
      if (loading || fetchInProgressRef.current) {
        return;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`ProductRowSlider[${componentKey}] - Initializing component`);
      }

      // Only fetch if we don't have relevant products
      const hasRelevantProducts = products && products.length > 0;
      if (!hasRelevantProducts) {
        await handleFetchProducts();
      }

      if (mounted) {
        setHasInitialized(true);
      }
    };

    initializeComponent();

    return () => {
      mounted = false;
    };
  }, [hasInitialized, memoizedProducts.length, loading, products, handleFetchProducts, componentKey]);

  // Update local products when memoized products change
  useEffect(() => {
    if (memoizedProducts.length > 0) {
      const productsChanged = JSON.stringify(localProducts) !== JSON.stringify(memoizedProducts);
      
      if (productsChanged) {
        setLocalProducts(memoizedProducts);
        if (process.env.NODE_ENV === 'development') {
          console.log(`ProductRowSlider[${componentKey}] - Local products updated:`, memoizedProducts.length);
        }
      }
    }
  }, [memoizedProducts, localProducts, componentKey]);

  // Handle location changes (only reset if it's a significant change)
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = locationRef.current;

    if (previousPath !== currentPath) {
      // Only reset if we're navigating to/from product pages or category changes
      const shouldReset = (
        currentPath.includes('/products') !== previousPath.includes('/products') ||
        currentPath.includes('/category') !== previousPath.includes('/category')
      );

      if (shouldReset) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`ProductRowSlider[${componentKey}] - Significant location change, resetting`);
        }
        locationRef.current = currentPath;
        setHasInitialized(false);
        setLocalProducts([]);
        lastFetchParamsRef.current = '';
      } else {
        locationRef.current = currentPath;
      }
    }
  }, [location.pathname, componentKey]);

  // Optimized socket handling
  useEffect(() => {
    let mounted = true;

    const connectSocket = () => {
      if (isSocketConnected) return;

      try {
        SocketService.connect();
        if (mounted) {
          setIsSocketConnected(true);
          if (process.env.NODE_ENV === 'development') {
            console.log(`ProductRowSlider[${componentKey}] - SocketService connected`);
          }
        }
      } catch (err) {
        console.error(`ProductRowSlider[${componentKey}] - SocketService connection error:`, err);
        toast.error('Failed to initialize real-time updates');
      }
    };

    // Debounced product update handler to prevent excessive API calls
    const debouncedProductUpdate = debounce((eventType, data) => {
      if (!mounted) return;

      if (process.env.NODE_ENV === 'development') {
        console.log(`ProductRowSlider[${componentKey}] - Product ${eventType}:`, data?.title || data?._id);
      }

      const productData = data.product || data;
      const productMatches = (
        (isFeatured && productData?.isFeatured) ||
        (!isFeatured && !productData?.isFeatured)
      ) && (
        !categoryId || 
        productData?.categoryId === categoryId || 
        productData?.categoryId?._id === categoryId
      );

      if (productMatches) {
        handleFetchProducts(true); // Force refresh for real-time updates
      }
    }, 1000); // 1 second debounce for socket events

    connectSocket();

    const handleProductUpdate = (eventType) => (data) => 
      debouncedProductUpdate(eventType, data);

    SocketService.on('productCreated', handleProductUpdate('created'));
    SocketService.on('productUpdated', handleProductUpdate('updated'));
    SocketService.on('productDeleted', handleProductUpdate('deleted'));

    return () => {
      mounted = false;
      debouncedProductUpdate.cancel();
      SocketService.off('productCreated');
      SocketService.off('productUpdated');
      SocketService.off('productDeleted');
      
      if (isSocketConnected) {
        SocketService.disconnect();
        setIsSocketConnected(false);
        if (process.env.NODE_ENV === 'development') {
          console.log(`ProductRowSlider[${componentKey}] - SocketService disconnected`);
        }
      }
    };
  }, [handleFetchProducts, isFeatured, categoryId, componentKey, isSocketConnected]);

  // Handle window resize with debouncing
  useEffect(() => {
    const debouncedResize = debounce(() => {
      setIsMobile(window.innerWidth < 768);
    }, 250);

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      debouncedResize.cancel();
    };
  }, []);

  // Manual retry function
  const handleRetry = useCallback(() => {
    setHasInitialized(false);
    setLocalProducts([]);
    lastFetchParamsRef.current = '';
    handleFetchProducts(true);
  }, [handleFetchProducts]);

  // Show loading state
  if (loading && localProducts.length === 0 && !hasInitialized) {
    return (
      <section className="relative w-full px-4 py-8 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6 px-4">
          {title && <h2 className="text-2xl font-bold text-gray-800">{title}</h2>}
        </div>
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  // Show error or empty state
  if ((error && localProducts.length === 0) || (hasInitialized && localProducts.length === 0)) {
    return (
      <section className="relative w-full px-4 py-8 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6 px-4">
          {title && <h2 className="text-2xl font-bold text-gray-800">{title}</h2>}
          <nav>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:underline transition-colors"
              onClick={() => navigate(categoryId ? `/products?category=${categoryId}` : '/products')}
              aria-label="View all products"
            >
              <span className="text-sm font-medium">View All</span>
              <ArrowRight size={16} />
            </Button>
          </nav>
        </div>
        <div className="text-center">
          <p className="text-lg text-gray-500 mb-4">
            {error ? `Failed to load products: ${error}` : `No ${isFeatured ? 'featured' : 'regular'} products found.`}
          </p>
          <Button
            onClick={handleRetry}
            variant="outline"
            disabled={loading || fetchInProgressRef.current}
          >
            {loading || fetchInProgressRef.current ? 'Loading...' : error ? 'Retry Now' : 'Load Products'}
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-gray-400">
              <p>Total products: {products?.length || 0}</p>
              <p>Filtered products: {localProducts.length}</p>
              <p>Looking for: {isFeatured ? 'Featured' : 'Regular'} products</p>
              <p>Category: {categoryId || 'All'}</p>
              <p>Component key: {componentKey}</p>
              <p>Has initialized: {hasInitialized.toString()}</p>
              <p>Fetch in progress: {fetchInProgressRef.current.toString()}</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full px-4 py-8 rounded-lg shadow-sm" aria-live="polite">
      <Helmet>
        <title>{title || 'Products'} | Raees Malls</title>
        <meta name="description" content={`Explore our ${title?.toLowerCase() || 'products'} with exclusive deals and limited stock.`} />
      </Helmet>

      <div className="flex justify-between items-center mb-6 px-4">
        {title && <h2 className="text-2xl font-bold text-gray-800">{title}</h2>}
        <nav>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:underline transition-colors"
            onClick={() => navigate(categoryId ? `/products?category=${categoryId}` : '/products')}
            aria-label="View all products"
          >
            <span className="text-sm font-medium">View All</span>
            <ArrowRight size={16} />
          </Button>
        </nav>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4">
        {localProducts.map(product => (
          <div key={product._id} className="w-full">
            <ProductCard product={product} compact={isMobile} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default ProductRowSlider;