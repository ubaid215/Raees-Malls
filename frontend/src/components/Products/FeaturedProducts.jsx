import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowRight } from 'lucide-react';
import Sidebanner from '../../assets/images/Side_banner_home_1_535x.webp';
import ProductCard from './ProductCard';
import Button from '../core/Button';
import LoadingSpinner from '../core/LoadingSpinner';
import { productService } from '../../services/productAPI';
import { Link } from 'react-router-dom';

function FeaturedProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFeaturedProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productService.getProducts({ isFeatured: true, limit: 6 });
      setProducts(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load featured products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedProducts();
  }, [fetchFeaturedProducts]);

  const memoizedProducts = useMemo(() => {
    return products.map((product) => ({
      _id: product._id,
      title: product.title,
      price: product.price,
      images: product.images?.[0]
        ? [product.images[0].startsWith('http') ? product.images[0] : `http://localhost:5000${product.images[0]}`]
        : ['/placeholder-product.png'],
      rating: product.rating ? Math.round(product.rating) : 0,
      numReviews: product.numReviews || 0,
      stock: product.stock || 0,
    }));
  }, [products]);

  if (loading) {
    return (
      <section aria-label="Loading Featured Products" className="w-full px-6 my-8 pb-5 text-center">
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Error Loading Featured Products" className="w-full px-6 my-8 pb-5 text-center">
        <p className="text-lg text-red-600">Error: {error}</p>
        <Button onClick={fetchFeaturedProducts} variant="outline" className="mt-2">
          Retry
        </Button>
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
          {memoizedProducts.length === 0 ? (
            <p className="text-center text-gray-500 text-lg">
              No featured products available.
            </p>
          ) : (
            memoizedProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default FeaturedProducts;