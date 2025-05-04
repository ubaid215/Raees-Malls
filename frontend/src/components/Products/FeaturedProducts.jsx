import React, { useState, useCallback, useMemo, useContext, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowRight } from 'lucide-react';
import Sidebanner from '../../assets/images/Side_banner_home_1_535x.webp';
import ProductCard from './ProductCard';
import Button from '../core/Button';
import LoadingSpinner from '../core/LoadingSpinner';
import { ProductContext } from '../../context/ProductContext';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../shared/config';
import SocketService from '../../services/socketService';
import { toast } from 'react-toastify';

function FeaturedProducts() {
  const { products, loading, error, fetchProducts } = useContext(ProductContext);
  const [needsFetch, setNeedsFetch] = useState(true);

  // Clear cache on mount to ensure fresh data
  useEffect(() => {
    const clearProductCaches = () => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('products_') || key.startsWith('product_')) {
          localStorage.removeItem(key);
        }
      });
    };

    clearProductCaches();
    setNeedsFetch(true); // Trigger fresh fetch
  }, []);

  // Fetch featured products
  useEffect(() => {
    if (needsFetch) {
      handleFetchFeaturedProducts();
    }
  }, [needsFetch]);

  const handleFetchFeaturedProducts = useCallback(async () => {
    try {
      await fetchProducts(
        { page: 1, limit: 6, isFeatured: true, sort: '-createdAt' },
        { isPublic: true, skipCache: true } // Skip cache to avoid stale data
      );
      setNeedsFetch(false);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error(err.message || 'Failed to load featured products');
    }
  }, [fetchProducts]);

  // Socket.IO integration for real-time updates
  useEffect(() => {
    SocketService.connect();

    const handleProductCreated = (data) => {
      // Trigger fetch if the new product is featured and in stock
      if (data.product.isFeatured && data.product.stock > 0) {
        setNeedsFetch(true);
        toast.success(`New featured product added: ${data.product.title}`);
      }
    };

    const handleProductUpdated = (data) => {
      // Trigger fetch if the product is featured
      if (data.product.isFeatured) {
        setNeedsFetch(true);
        toast.info(`Featured product updated: ${data.product.title}`);
      }
    };

    const handleProductDeleted = (data) => {
      // Trigger fetch to refresh the list
      setNeedsFetch(true);
      toast.warn('Featured product removed');
    };

    SocketService.on('productCreated', handleProductCreated);
    SocketService.on('productUpdated', handleProductUpdated);
    SocketService.on('productDeleted', handleProductDeleted);

    return () => {
      SocketService.off('productCreated', handleProductCreated);
      SocketService.off('productUpdated', handleProductUpdated);
      SocketService.off('productDeleted', handleProductDeleted);
      SocketService.disconnect();
    };
  }, []);

  const memoizedProducts = useMemo(() => {
    const productArray = Array.isArray(products) ? products : [];
    
    return productArray.map((product) => {
      // Ensure images are properly structured
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
        price: product.discountPrice || product.price || 0,
        originalPrice: product.price || 0,
        images, // Pass the properly structured images array
        averageRating: product.averageRating || product.rating || 0,
        numReviews: product.numReviews || 0,
        stock: product.stock || 0,
        isOnSale: !!product.discountPrice && product.discountPrice < product.price,
        categoryId: product.categoryId,
        sku: product.sku,
        displayPrice: product.displayPrice,
      };
    });
  }, [products]);

  if (loading && memoizedProducts.length === 0) {
    return (
      <section aria-label="Loading Featured Products" className="w-full px-4 sm:px-6 my-6 sm:my-8 pb-5 text-center">
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="No Featured Products" className="w-full px-4 sm:px-6 my-6 sm:my-8 pb-5 text-center">
        <p className="text-base sm:text-lg text-gray-500 mb-4">
          Failed to load featured products: {error}
        </p>
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={handleFetchFeaturedProducts}
            variant="outline"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Retry Now'}
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

      {/* Mobile Banner (Shown only on small screens) */}
      <div className="block sm:hidden w-full mb-6 rounded-lg overflow-hidden relative">
        <img
          src={Sidebanner}
          alt="Promotional banner for up to 50% off sale"
          className="w-full h-auto max-h-40 object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 flex flex-col justify-center px-4">
          <h5 className="uppercase text-white text-xs">Upto 50% off</h5>
          <h1 className="text-white text-xl font-semibold mt-1">
            Limited <span className="text-red-400">Stock</span>, Huge Saving
          </h1>
          <Link to="/products/sale" className="mt-2">
            <Button size="sm" className="text-white py-1 px-3">Shop Now</Button>
          </Link>
        </div>
      </div>

      <div className="flex items-start justify-center gap-4 lg:gap-8 w-full">
        {/* Desktop Side Banner (Shown only on large screens) */}
        <div className="hidden lg:block w-[30%] h-[160vh] rounded-xl overflow-hidden relative">
          <img
            src={Sidebanner}
            alt="Promotional banner for up to 50% off sale"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <h5 className="uppercase absolute top-10 left-7 text-white">Upto 50% off</h5>
          <h1 className="absolute top-20 left-7 text-white text-3xl font-semibold">
            Limited <span className="text-red-600">Stock</span>, <br />Huge Saving
          </h1>
          <Link to="/products/sale">
            <Button className="absolute top-44 left-7 text-white">Shop Now</Button>
          </Link>
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
              >
                Refresh Products
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default FeaturedProducts;