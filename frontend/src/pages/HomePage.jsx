import React from 'react';
import HeroSection from '../components/layout/Home/HeroSection';
import FeaturedProducts from '../components/Products/FeaturedProducts';
import ProductRowSlider from '../components/Products/ProductRowSlider';

function HomePage() {
  return (
    <div className='bg-[#F5F5F5]'>
      <HeroSection />
      <FeaturedProducts />
      <ProductRowSlider title="New Products" />
    </div>
  );
}

export default HomePage;