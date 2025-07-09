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
  const [isMobile, setIsMobile] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  const mountCount = useRef(0);

  // Log component mounts for debugging
  useEffect(() => {
    mountCount.current += 1;
    if (process.env.NODE_ENV === 'development') {
      console.log(`ProductRowSlider mounted ${mountCount.current} times`);
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('ProductRowSlider unmounted');
      }
    };
  }, []);

  // Debug logging for products
  useEffect(() => {
    if (products?.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('ProductRowSlider - Products loaded:', {
        isFeatured,
        productsLength: products.length,
        categoryId,
        hasInitialized,
      });
    }
  }, [products, isFeatured, categoryId, hasInitialized]);

  // Memoized products
  const memoizedProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }

    const filteredProducts = products.filter(product => {
      const featuredMatch = isFeatured ? product.isFeatured : !product.isFeatured;
      const categoryMatch = categoryId ? product.categoryId?._id === categoryId || product.categoryId === categoryId : true;
      const stockMatch = product.stock > 0;
      return featuredMatch && categoryMatch && stockMatch;
    });

    if (filteredProducts.length > 0 && process.env.NODE_ENV === 'development') {
      console.log(`ProductRowSlider - Filtered ${filteredProducts.length} products (${isFeatured ? 'featured' : 'regular'})`);
    }

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

  // Update local products only when necessary
  useEffect(() => {
    if (memoizedProducts.length > 0 && !hasInitialized) {
      setLocalProducts(memoizedProducts);
      setHasInitialized(true);
      if (process.env.NODE_ENV === 'development') {
        console.log('ProductRowSlider - Products initialized:', memoizedProducts.length);
      }
    } else if (memoizedProducts.length > 0 && JSON.stringify(localProducts) !== JSON.stringify(memoizedProducts)) {
      setLocalProducts(memoizedProducts);
      if (process.env.NODE_ENV === 'development') {
        console.log('ProductRowSlider - Local products updated:', memoizedProducts.length);
      }
    }
  }, [memoizedProducts, hasInitialized, localProducts]);

  // Debounced fetch products
  const handleFetchProducts = useCallback(
    debounce(async () => {
      try {
        const params = {
          page: 1,
          limit: 50,
          sort: '-createdAt',
          ...(categoryId ? { categoryId } : {}),
        };

        const result = await fetchProducts(params, { isPublic: true, skipCache: true });

        if (process.env.NODE_ENV === 'development') {
          console.log('ProductRowSlider - API Response:', result);
        }
      } catch (err) {
        console.error('ProductRowSlider - Fetch error:', err);
        toast.error(err.message || 'Failed to load products');
      }
    }, 500),
    [fetchProducts, categoryId]
  );

  // Initial fetch
  useEffect(() => {
    let hasFetched = false;

    const initializeProducts = async () => {
      if (hasFetched || hasInitialized || loading) return;
      hasFetched = true;

      if (process.env.NODE_ENV === 'development') {
        console.log('ProductRowSlider - Initial fetch triggered');
      }
      await handleFetchProducts();
    };

    initializeProducts();

    return () => {
      hasFetched = false;
    };
  }, [handleFetchProducts, hasInitialized, loading]);

  // Handle location changes
  useEffect(() => {
    if (locationRef.current !== location.pathname) {
      if (process.env.NODE_ENV === 'development') {
        console.log('ProductRowSlider - Location changed, resetting');
      }
      locationRef.current = location.pathname;
      setHasInitialized(false);
      setLocalProducts([]);
    }
  }, [location.pathname]);

  // Socket handling
  useEffect(() => {
    let isConnected = false;

    const connectSocket = () => {
      try {
        if (!isConnected) {
          SocketService.connect();
          isConnected = true;
          if (process.env.NODE_ENV === 'development') {
            console.log('ProductRowSlider - SocketService connected');
          }
        }
      } catch (err) {
        console.error('ProductRowSlider - SocketService connection error:', err);
        toast.error('Failed to initialize real-time updates');
      }
    };

    const handleProductUpdate = (eventType, data) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`ProductRowSlider - Product ${eventType}:`, data?.title || data?._id);
      }
      const productMatches =
        (isFeatured && data.product?.isFeatured) ||
        (!isFeatured && !data.product?.isFeatured) ||
        (categoryId && (data.product?.categoryId === categoryId || data.product?.categoryId?._id === categoryId));
      if (productMatches) {
        handleFetchProducts();
      }
    };

    connectSocket();

    SocketService.on('productCreated', data => handleProductUpdate('created', data));
    SocketService.on('productUpdated', data => handleProductUpdate('updated', data));
    SocketService.on('productDeleted', data => handleProductUpdate('deleted', data));

    return () => {
      SocketService.off('productCreated');
      SocketService.off('productUpdated');
      SocketService.off('productDeleted');
      if (isConnected) {
        SocketService.disconnect();
        isConnected = false;
        if (process.env.NODE_ENV === 'development') {
          console.log('ProductRowSlider - SocketService disconnected');
        }
      }
    };
  }, [handleFetchProducts, isFeatured, categoryId]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show loading state
  if (loading && localProducts.length === 0) {
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
  if (error || localProducts.length === 0) {
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
            onClick={handleFetchProducts}
            variant="outline"
            disabled={loading}
          >
            {loading ? 'Loading...' : error ? 'Retry Now' : 'Load Products'}
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-gray-400">
              <p>Total products: {products?.length || 0}</p>
              <p>Looking for: {isFeatured ? 'Featured' : 'Regular'} products</p>
              <p>Category: {categoryId || 'All'}</p>
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