import React from 'react';
import { Link } from 'react-router-dom';
import HeroSlider from '../components/shared/HeroSlider';
import FeaturedProducts from '../pages/FeaturedProducts'; 

const HomePage = () => {
  const categories = [
    { id: 1, name: 'Electronics', image: '/placeholder-category.jpg' },
    { id: 2, name: 'Clothing', image: '/placeholder-category.jpg' },
    { id: 3, name: 'Home & Kitchen', image: '/placeholder-category.jpg' },
    { id: 4, name: 'Beauty', image: '/placeholder-category.jpg' },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section - HeroSlider */}
      <HeroSlider />

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 animate-fadeIn">
            Featured Products
          </h2>
          <FeaturedProducts />
          <div className="text-center mt-12 animate-fadeIn">
            <Link
              to="/products"
              className="inline-block bg-red-600 text-white font-medium px-6 py-3 rounded-md shadow-md hover:bg-red-700 transition duration-300 transform hover:scale-105"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 animate-fadeIn">
            Shop by Category
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={`/categories/${category.id}`}
                className="group animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative overflow-hidden rounded-lg h-48">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.target.src = '/placeholder-category.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent flex items-end p-4">
                    <h3 className="text-white text-xl font-medium">{category.name}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="bg-red-600 text-white rounded-lg p-8 md:p-12 animate-fadeIn">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Subscribe to Our Newsletter
                </h2>
                <p className="text-red-100">
                  Get updates on new products and exclusive offers.
                </p>
              </div>
              <div className="w-full md:w-auto">
                <form className="flex">
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="w-full md:w-64 px-4 py-3 rounded-l-md focus:outline-none text-gray-700"
                  />
                  <button
                    type="submit"
                    className="bg-gray-900 px-4 py-3 rounded-r-md font-medium hover:bg-gray-800 transition duration-300"
                  >
                    Subscribe
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;