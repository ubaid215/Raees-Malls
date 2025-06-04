import React, { useState, useCallback, useMemo, useContext, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowRight } from 'lucide-react';
import Sidebanner from '../../assets/images/Side_banner_home_1_535x.webp';
import ProductCard from './ProductCard';
import Button from '../core/Button';
import LoadingSpinner from '../core/LoadingSpinner';
import { ProductContext } from '../../context/ProductContext';
import { useBanners } from '../../context/BannerContext';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../shared/config';
import SocketService from '../../services/socketService';
import { toast } from 'react-toastify';

function FeaturedProducts() {
  const { products, loading: productsLoading, error: productsError, fetchFeaturedProducts } = useContext(ProductContext);
  const { banners, loading: bannersLoading } = useBanners();
  const [isInitialized, setIsInitialized] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Initialize products on mount
  useEffect(() => {
    let isMounted = true;

    const initializeProducts = async () => {
      try {
        setLocalError(null);
        // Always fetch on mount to ensure fresh data, bypass cache if no featured products
        const hasFeaturedProducts = products?.some(p => p.isFeatured);
        await fetchFeaturedProducts(
          { page: 1, limit: 6, sort: '-createdAt' },
          { skipCache: !hasFeaturedProducts } // Bypass cache if no featured products
        );
        
        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Initialize featured products error:', err);
        if (isMounted) {
          setLocalError(err.message || 'Failed to load featured products');
          setIsInitialized(true);
        }
      }
    };

    initializeProducts();

    return () => {
      isMounted = false;
    };
  }, [fetchFeaturedProducts, products]);

  const handleFetchFeaturedProducts = useCallback(async () => {
    try {
      setLocalError(null);
      await fetchFeaturedProducts(
        { page: 1, limit: 6, sort: '-createdAt' },
        { skipCache: true } // Always bypass cache on manual refresh
      );
    } catch (err) {
      console.error('Fetch featured products error:', err);
      setLocalError(err.message || 'Failed to load featured products');
      toast.error(err.message || 'Failed to load featured products');
    }
  }, [fetchFeaturedProducts]);

  // Socket connection and event handling
  useEffect(() => {
    if (!isInitialized) return;

    let isConnected = false;

    const connectSocket = () => {
      if (!isConnected) {
        SocketService.connect();
        isConnected = true;
      }
    };

    const handleProductCreated = (data) => {
      if (data.product?.isFeatured && data.product?.stock > 0) {
        handleFetchFeaturedProducts();
        toast.success(`New featured product added: ${data.product.title}`);
      }
    };

    const handleProductUpdated = (data) => {
      if (data.product?.isFeatured) {
        handleFetchFeaturedProducts();
        toast.info(`Featured product updated: ${data.product.title}`);
      }
    };

    const handleProductDeleted = () => {
      handleFetchFeaturedProducts();
      toast.warn('Featured product removed');
    };

    connectSocket();

    SocketService.on('productCreated', handleProductCreated);
    SocketService.on('productUpdated', handleProductUpdated);
    SocketService.on('productDeleted', handleProductDeleted);

    return () => {
      SocketService.off('productCreated', handleProductCreated);
      SocketService.off('productUpdated', handleProductUpdated);
      SocketService.off('productDeleted', handleProductDeleted);
      if (isConnected) {
        SocketService.disconnect();
        isConnected = false;
      }
    };
  }, [isInitialized, handleFetchFeaturedProducts]);

  const memoizedProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }
    
    return products
      .filter(product => product?.isFeatured === true)
      .map((product) => {
        const images = product.images && product.images.length > 0
          ? product.images.map(image => ({
              url: image.url
                ? image.url.startsWith('http')
                  ? image.url
                  : `${API_BASE_URL}${image.url}`
                : '/images/placeholder-product.png',
              public_id: image.public_id || '',
              alt: image.alt || product.title || 'Product image'
            }))
          : [{ url: '/images/placeholder-product.png', public_id: '', alt: product.title || 'Product image' }];

        return {
          _id: product._id,
          title: product.title || product.name || 'Untitled Product',
          price: product.price || 0,
          discountPrice: product.discountPrice || null,
          images,
          averageRating: product.averageRating || product.rating || 0,
          numReviews: product.numReviews || 0,
          stock: product.stock || 0,
          categoryId: product.categoryId,
          sku: product.sku,
          isFeatured: product.isFeatured || false
        };
      });
  }, [products]);

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

  if (hasError) {
    return (
      <section aria-label="No Featured Products" className="w-full px-4 sm:px-6 my-6 sm:my-8 pb-5 text-center">
        <p className="text-base sm:text-lg text-gray-500 mb-4">
          Failed to load featured products: {hasError}
        </p>
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={handleFetchFeaturedProducts}
            variant="outline"
            disabled={productsLoading}
          >
            {productsLoading ? 'Loading...' : 'Retry Now'}
          </Button>
          <Link to="/all-products" className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors">
            View All Products <ArrowRight size={16} className="sm:size-18" />
          </Link>
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold">Featured Products</h1>
        <nav className="mt-2 sm:mt-0">
          <Link 
            to="/products" 
            className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base text-red-500 hover:text-red-800 transition-colors"
          >
            View All <ArrowRight size={16} />
          </Link>
        </nav>
      </div>

      <div className="flex items-start justify-center gap-4 lg:gap-8 w-full">
        <div className="hidden lg:block w-[30%] h-[160vh] rounded-xl overflow-hidden relative">
          {bannersLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <Link to="/products">
              <img
                src={banners.find(b => b.position === 'featured-products-banner' && b.isActive)?.image.url || Sidebanner}
                alt={banners.find(b => b.position === 'featured-products-banner' && b.isActive)?.image.alt || 'Promotional banner'}
                className="w-full h-full object-center object-cover"
                loading="lazy"
              />
              <h5 className="uppercase absolute top-10 left-7 text-white">
                {banners.find(b => b.position === 'featured-products-banner' && b.isActive)?.title || 'Upto 50% off'}
              </h5>
              <h1 className="absolute top-20 left-7 text-white text-3xl font-semibold">
                {banners.find(b => b.position === 'featured-products-banner' && b.isActive)?.description || 'Limited Stock, Huge Saving'}
              </h1>
            </Link>
          )}
        </div>

        <div className="w-full lg:w-[70%] grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-3 sm:gap-4 md:gap-6">
          {memoizedProducts.length > 0 ? (
            memoizedProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
              />
            ))
          ) : (
            <div className="col-span-2 md:col-span-2 lg:col-span-3 text-center py-8 sm:py-10">
              <p className="text-gray-500 text-sm sm:text-base">No featured products available</p>
              <Button 
                onClick={handleFetchFeaturedProducts}
                className="mt-3 sm:mt-4 text-sm"
                disabled={productsLoading}
              >
                {productsLoading ? 'Loading...' : 'Refresh Products'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default FeaturedProducts;