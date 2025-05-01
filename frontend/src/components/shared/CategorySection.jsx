import React, { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CategoryContext } from '../../context/CategoryContext';
import LoadingSkeleton from '../shared/LoadingSkelaton';
import { toast } from 'react-toastify';
import { FiGrid, FiRefreshCw } from 'react-icons/fi';

const CategorySection = () => {
  const { categories, loading, error, fetchCategories } = useContext(CategoryContext);

  // Automatically fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        await fetchCategories({ isPublic: true });
      } catch (err) {
        console.error("Category fetch error:", err);
        toast.error(err.message || 'Failed to fetch categories');
      }
    };
    if (categories.length === 0 && !loading && !error) {
      loadCategories();
    }
  }, [fetchCategories, categories, loading, error]);

  const handleFetchCategories = async () => {
    try {
      await fetchCategories({ isPublic: true });
    } catch (err) {
      console.error("Category fetch error:", err);
      toast.error(err.message || 'Failed to fetch categories');
    }
  };

  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <LoadingSkeleton type="text" width="64" height="10" className="mx-auto" />
            <LoadingSkeleton type="text" width="96" height="4" className="mx-auto mt-2" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex flex-col">
                <LoadingSkeleton type="rect" width="full" height="40" className="mb-4 rounded-lg" />
                <LoadingSkeleton type="text" width="20" height="6" className="mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-xl shadow-sm">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load categories</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={handleFetchCategories}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <FiRefreshCw className="mr-2" /> Try Again
          </button>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-xl shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiGrid className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories Available</h3>
          <p className="text-gray-500 mb-6">Click below to load product categories or browse all products.</p>
          <div className="flex flex-col gap-4">
            <button
              onClick={handleFetchCategories}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Load Categories
            </button>
            <Link
              to="/products"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 border-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Browse All Products
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-7">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Shop by Category</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Explore our wide range of products organized by category
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {categories.map((category) => (
            <Link
              key={category._id}
              to={`/products?category=${category.slug || category._id}`}
              className="group flex flex-col rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-white"
            >
              <div className="relative w-full h-40 bg-gray-100 overflow-hidden">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = '/placeholder-category.png';
                      e.target.className = 'w-full h-full object-contain p-4';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FiGrid className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="p-4 text-center">
                <h3 className="font-medium text-gray-900 group-hover:text-red-600 transition-colors duration-200">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;