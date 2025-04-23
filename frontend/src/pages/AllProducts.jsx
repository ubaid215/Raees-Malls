import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Helmet } from 'react-helmet';
import { DotIcon, Heart, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/core/Button';
import LoadingSpinner from '../components/core/LoadingSpinner';
import { productService, categoryService } from '../services/productAPI';

// ProductCard component with navigation and memoization
const ProductCard = memo(({ _id, image, title, price, rating, numReviews, stock }) => {
  const navigate = useNavigate();

  const handleCardClick = useCallback((e) => {
    const isHeartClick = e.target.closest('svg[data-heart="true"]');
    const isCartButtonClick = e.target.closest('button');
    if (!isHeartClick && !isCartButtonClick) {
      navigate(`/product/${_id}`);
    }
  }, [_id, navigate]);

  const handleHeartClick = useCallback((e) => {
    e.stopPropagation();
    console.log("Added to wishlist");
  }, []);

  const handleAddToCartClick = useCallback((e) => {
    e.stopPropagation();
    console.log("Added to cart");
  }, []);

  return (
    <div
      className="w-64 h-auto flex flex-col items-center overflow-hidden hover:shadow-xl bg-white rounded-xl shadow-lg cursor-pointer"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(e)}
    >
      <div className="relative overflow-hidden group">
        <img
          src={image}
          alt={title}
          className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <Heart
          data-heart="true"
          onClick={handleHeartClick}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
          aria-label="Add to wishlist"
        />
        <Button
          onClick={handleAddToCartClick}
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[90%] opacity-0 group-hover:opacity-100 group-hover:translate-y-[-10px] transition-all duration-300 flex items-center justify-center gap-3 bg-red-500 text-white px-6 py-3 rounded-lg"
          aria-label={`Add ${title} to cart`}
        >
          <ShoppingCart size={20} />
          <span className="text-base whitespace-nowrap">Add to cart</span>
        </Button>
      </div>
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-black hover:text-red-500">
          {title}
        </h2>
        <p className="text-lg">{price} PKR</p>
        <p className="text-base">
          {"⭐".repeat(Math.round(rating))} ({numReviews})
        </p>
        <p className="flex items-center justify-center gap-2 text-green-500 text-base">
          <DotIcon size={40} /> {stock} in Stock
        </p>
      </div>
    </div>
  );
});

function AllProducts() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      const fetchedCategories = await categoryService.getAllCategories();
      setCategories([{ _id: 'all', name: 'All Categories' }, ...fetchedCategories]);
    } catch (err) {
      setError(err.message || 'Failed to fetch categories');
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productService.getProducts({
        page: 1,
        limit: 12,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      setProducts(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchProducts()])
      .catch((err) => setError(err.message || 'Failed to initialize data'));
  }, [fetchCategories, fetchProducts]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') {
      return products;
    }
    return products.filter((product) =>
      product.categories.some((category) => category._id === selectedCategory)
    );
  }, [selectedCategory, products]);

  const memoizedProducts = useMemo(() => {
    return filteredProducts.map((product) => ({
      _id: product._id,
      image: product.images?.[0]
        ? product.images[0].startsWith('http')
          ? product.images[0]
          : `http://localhost:5000${product.images[0]}`
        : '/placeholder-product.png',
      title: product.title,
      price: product.price,
      rating: product.rating ? parseFloat(product.rating) : 0,
      numReviews: product.numReviews || 0,
      stock: product.stock || 0,
    }));
  }, [filteredProducts]);

  if (loading) {
    return (
      <section aria-label="Loading All Products" className="w-full h-auto py-8 bg-gray-50">
        <h1 className="text-center lg:text-4xl text-2xl font-bold text-gray-800 pb-6">
          Our Products
        </h1>
        <div className="w-full px-4 lg:px-8 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Error Loading All Products" className="w-full h-auto py-8 bg-gray-50 text-center">
        <p className="text-lg text-red-600">Error: {error}</p>
        <Button
          onClick={() => {
            fetchCategories();
            fetchProducts();
          }}
          variant="outline"
          className="mt-2"
        >
          Retry
        </Button>
      </section>
    );
  }

  return (
    <section aria-label="All Products" className="w-full h-auto py-8 bg-gray-50">
      <Helmet>
        <title>All Products | Your Store</title>
        <meta name="description" content="Browse our full collection of products across various categories with exclusive deals." />
      </Helmet>
      <h1 className="text-center lg:text-4xl text-2xl font-bold text-gray-800 pb-6">
        Our Products
      </h1>

      <div className="w-full px-4 lg:px-8 flex flex-col lg:flex-row gap-6">
        <nav className="w-full lg:w-[25%] h-auto lg:h-[calc(100vh-150px)] bg-white rounded-lg shadow-md p-6 sticky top-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Filter</h2>
          <hr className="mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-3">Categories</h3>
          <ul className="space-y-2">
            {categories.map((category) => (
              <li key={category._id}>
                <button
                  onClick={() => setSelectedCategory(category._id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedCategory === category._id
                      ? 'bg-red-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-label={`Filter by ${category.name}`}
                  aria-current={selectedCategory === category._id ? 'true' : 'false'}
                >
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="w-full lg:w-[75%] h-auto">
          {memoizedProducts.length === 0 ? (
            <p className="text-center text-gray-500 text-lg">
              No products found in this category.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {memoizedProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  _id={product._id}
                  image={product.image}
                  title={product.title}
                  price={product.price}
                  rating={product.rating}
                  numReviews={product.numReviews}
                  stock={product.stock}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default AllProducts;