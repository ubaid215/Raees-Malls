import React, { useState, useCallback, useMemo, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowRight } from 'lucide-react';
import Sidebanner from '../../assets/images/Side_banner_home_1_535x.webp';
import ProductCard from './ProductCard';
import Button from '../core/Button';
import LoadingSpinner from '../core/LoadingSpinner';
import { ProductContext } from '../../context/ProductContext';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../shared/config';

function FeaturedProducts() {
  const { products, loading, error, fetchProducts } = useContext(ProductContext);
  const [needsFetch, setNeedsFetch] = useState(true);

  const handleFetchFeaturedProducts = useCallback(async () => {
    try {
      await fetchProducts(1, 6, null, true, { isPublic: true });
      setNeedsFetch(false);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [fetchProducts]);

  const memoizedProducts = useMemo(() => {
    return products.map((product) => {
      const firstImage = product.images?.[0];
      const imageUrl = firstImage?.url
        ? firstImage.url.startsWith('http')
          ? firstImage.url
          : `${API_BASE_URL}${firstImage.url}`
        : '/placeholder-product.png';

      return {
        _id: product._id,
        title: product.title || product.name || 'Untitled Product',
        price: product.discountPrice || product.price || 0,
        originalPrice: product.price || 0,
        images: [imageUrl],
        rating: product.averageRating || product.rating || 0,
        numReviews: product.numReviews || 0,
        stock: product.stock || 0,
        isOnSale: !!product.discountPrice && product.discountPrice < product.price,
      };
    });
  }, [products]);

  if (loading && products.length === 0) {
    return (
      <section aria-label="Loading Featured Products" className="w-full px-6 my-8 pb-5 text-center">
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (error || products.length === 0 || needsFetch) {
    return (
      <section aria-label="No Featured Products" className="w-full px-6 my-8 pb-5 text-center">
        <p className="text-lg text-gray-500 mb-4">
          {error ? 'Failed to load featured products.' : 'No featured products loaded.'}
        </p>
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={handleFetchFeaturedProducts}
            variant="outline"
            disabled={loading}
          >
            {loading ? 'Loading...' : error ? 'Retry Now' : 'Load Featured Products'}
          </Button>
          <Link to="/products" className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors">
            View All Products <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Featured Products" className="w-full px-6 my-8 pb-5">
      <Helmet>
        <title>Featured Products | Your Store</title>
        <meta name="description" content="Explore our handpicked selection of featured products with exclusive discounts and limited stock." />
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold">Featured Products</h1>
        <nav>
          <Link to="/products" className="flex items-center gap-2 border-b-2 hover:text-red-500 transition-colors">
            View All <ArrowRight size={18} />
          </Link>
        </nav>
      </div>

      <div className="flex items-start justify-center gap-8 w-full">
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

        <div className="w-full lg:w-[70%] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {memoizedProducts.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturedProducts;