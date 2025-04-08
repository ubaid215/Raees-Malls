import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import LoadingSpinner from "../components/core/LoadingSpinner";

const FeaturedProducts = ({ products = [] }) => {
  const [loading, setLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    // Filter featured products
    const filteredProducts = products.filter(
      (product) => product.isFeatured === true
    );
    setFeaturedProducts(filteredProducts);
    setLoading(false);
  }, [products]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
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
              key={product._id || product.title}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="relative h-48">
                <img
                  src={
                    product.images?.[0]?.url ||
                    product.images?.[0] ||
                    "/placeholder-product.png"
                  }
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
                <button className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors duration-200">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

FeaturedProducts.propTypes = {
  products: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      price: PropTypes.number.isRequired,
      stock: PropTypes.number,
      images: PropTypes.arrayOf(
        PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.shape({ url: PropTypes.string }),
        ])
      ),
      isFeatured: PropTypes.bool,
    })
  ),
};

export default FeaturedProducts;