import React, { useState, useEffect } from "react";
import { getProducts } from "../services/productAPI";
import LoadingSpinner from "../components/core/LoadingSpinner";
import { Link } from "react-router-dom"; // Added for navigation to product details

const FeaturedProducts = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true);
        // Fetch products with isFeatured: true
        const { data } = await getProducts({ 
          page: 1, 
          limit: 12, 
          search: '', // No search term
          isFeatured: true // Add filter for featured products
        });
        console.log("Fetched featured products:", data);
        // Format data to match component expectations
        const formattedProducts = data.map(product => ({
          ...product,
          id: product._id, // Convert _id to id
          images: product.images.map(img => `http://localhost:5000${img}`), // Full image URLs
        }));
        setFeaturedProducts(formattedProducts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []); // Empty dependency array means it fetches once on mount

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error loading featured products: {error}
      </div>
    );
  }

  if (featuredProducts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No featured products available
      </div>
    );
  }

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Featured Products
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <div
              key={product.id} // Use id instead of _id
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="relative h-48">
                <img
                  src={product.images[0] || "/placeholder-product.png"}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "/placeholder-product.png";
                  }}
                />
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  Featured
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {product.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {product.description}
                </p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">
                    PKR {product.price.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {product.stock > 0 ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
                <Link to={`/products/${product.id}`}>
                  <button className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors duration-200">
                    View Details
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;