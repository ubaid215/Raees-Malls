import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
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

  // ✅ Reduced debug logging - only log when products actually change
  useEffect(() => {
    if (products?.length > 0) {
      console.log('ProductRowSlider - Products loaded:', {
        isFeatured,
        productsLength: products.length,
        categoryId,
        hasInitialized
      });
    }
  }, [products?.length]); // Only depend on products length, not the full products array

  // ✅ Simplified memoized products with reduced logging
  const memoizedProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }

    // ✅ Apply filters based on component props
    const filteredProducts = products.filter(product => {
      // Filter by featured status
      const featuredMatch = isFeatured ? product.isFeatured : !product.isFeatured;
      
      // Filter by category if specified
      const categoryMatch = categoryId ? product.categoryId === categoryId : true;
      
      // Filter by stock (optional - only show in-stock items)
      const stockMatch = product.stock > 0;
      
      return featuredMatch && categoryMatch && stockMatch;
    });

    // ✅ Log only the final count, not each product
    if (filteredProducts.length > 0) {
      console.log(`ProductRowSlider - Filtered ${filteredProducts.length} products (${isFeatured ? 'featured' : 'regular'})`);
    }

    // ✅ Process images and format data
    const processedProducts = filteredProducts.map((product) => {
      const images = Array.isArray(product.images) ? product.images : [];

      const processedImages = images.map(img => {
        let url = img?.url || '';
        if (url && !url.startsWith('http')) {
          url = `${API_BASE_URL}${url}`;
        }
        return {
          url: url || '/images/placeholder-product.png',
          alt: img?.alt || product.title || 'Product image'
        };
      });

      if (processedImages.length === 0) {
        processedImages.push({
          url: '/images/placeholder-product.png',
          alt: 'Placeholder product image'
        });
      }

      return {
        _id: product._id,
        title: product.title || product.name || 'Untitled Product',
        price: product.price || 0,
        discountPrice: product.discountPrice || null,
        images: processedImages,
        averageRating: product.averageRating || product.rating || 0,
        numReviews: product.numReviews || 0,
        stock: product.stock || 0,
        sku: product.sku || '',
        categoryId: product.categoryId || null,
        isFeatured: product.isFeatured || false,
        createdAt: product.createdAt
      };
    });

    // ✅ Sort and limit
    const finalProducts = processedProducts
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 16);

    return finalProducts;
  }, [products, isFeatured, categoryId]);

  // ✅ Update local products when memoized products change
  useEffect(() => {
    if (memoizedProducts.length > 0 && !hasInitialized) {
      setLocalProducts(memoizedProducts);
      setHasInitialized(true);
      console.log('ProductRowSlider - Products initialized:', memoizedProducts.length);
    } else if (memoizedProducts.length > 0) {
      setLocalProducts(memoizedProducts);
    }
  }, [memoizedProducts, hasInitialized]);

  // ✅ Simplified fetch function
  const handleFetchProducts = useCallback(async () => {
    try {
      const params = {
        page: 1,
        limit: 50, // ✅ Fetch more to ensure we have enough after filtering
        sort: '-createdAt',
        // ✅ Don't filter by featured in API call - let frontend handle it
        ...(categoryId ? { category: categoryId } : {})
      };

      await fetchProducts(params, { isPublic: true, skipCache: true });
    } catch (err) {
      console.error('ProductRowSlider - Fetch error:', err);
      toast.error(err.message || 'Failed to load products');
    }
  }, [fetchProducts, categoryId]); // ✅ Removed isFeatured from dependency

  // ✅ Initial fetch on mount
  useEffect(() => {
    if (!hasInitialized && !loading) {
      console.log('ProductRowSlider - Initial fetch triggered');
      handleFetchProducts();
    }
  }, [hasInitialized, loading, handleFetchProducts]);

  // ✅ Handle location changes
  useEffect(() => {
    if (locationRef.current !== location.pathname) {
      console.log('ProductRowSlider - Location changed, resetting');
      locationRef.current = location.pathname;
      setHasInitialized(false);
      setLocalProducts([]);
    }
  }, [location.pathname]);

  // ✅ Simplified socket handling
  useEffect(() => {
    const connectSocket = () => {
      SocketService.connect();

      const handleProductUpdate = (eventType, data) => {
        console.log(`ProductRowSlider - Product ${eventType}:`, data?.title || data?._id);
        // ✅ Simple refresh - let the memoization handle filtering
        setHasInitialized(false);
        handleFetchProducts();
      };

      SocketService.on('productCreated', (data) => handleProductUpdate('created', data));
      SocketService.on('productUpdated', (data) => handleProductUpdate('updated', data));
      SocketService.on('productDeleted', (data) => handleProductUpdate('deleted', data));
    };

    connectSocket();

    return () => {
      SocketService.off('productCreated');
      SocketService.off('productUpdated');
      SocketService.off('productDeleted');
      SocketService.disconnect();
    };
  }, [handleFetchProducts]);

  // ✅ Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ Show loading state
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

  // ✅ Show error or empty state
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
          {/* ✅ Debug info - only show in development */}
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

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
        {localProducts.map((product) => (
          <div key={product._id} className="w-full">
            <ProductCard 
              product={product} 
              compact={isMobile} 
            />
          </div>
        ))}
      </div>

      {/* Show total count - only in development
      {process.env.NODE_ENV === 'development' && localProducts.length > 0 && (
        <div className="text-center mt-6 px-4">
          <p className="text-sm text-gray-600">
            Showing {localProducts.length} {isFeatured ? 'featured' : 'newest'} products
          </p>
        </div>
      )} */}
    </section>
  );
}

export default ProductRowSlider;