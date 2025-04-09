import React from 'react';
import { Link } from 'react-router-dom';
import HeroSlider from '../components/shared/HeroSlider';
import FeaturedProducts from '../pages/FeaturedProducts'; 
import CategorySection from '../components/shared/CategorySection';
import RecentProducts from '../components/shared/RecentProducts';

const HomePage = () => {

  return (
    <div className="bg-white">
      {/* Hero Section - HeroSlider */}
      <HeroSlider />

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
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

      {/********** Recent Products Section ***********/ }
      <section className='bg-gray-50'>
        <RecentProducts/>
      </section>

      {/********* Categories Section ************/}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <CategorySection />
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