import React from 'react';
import MiniBanner from '../components/layout/MiniBanner';
import HeroSection from '../components/layout/Home/HeroSection';
import FeaturedProducts from '../components/Products/FeaturedProducts';
import ProductRowSlider from '../components/Products/ProductRowSlider';

function HomePage() {
  return (
    <div className='bg-[#F5F5F5]'>
      <MiniBanner />
      <HeroSection />
      <FeaturedProducts />
      <ProductRowSlider title="New Products" />
    </div>
  );
}

export default HomePage;
