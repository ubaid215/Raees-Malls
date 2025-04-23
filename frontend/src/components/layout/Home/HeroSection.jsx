import React, { useEffect, useState } from 'react';
import { useSlider } from '../../../context/SliderContext';
import { useBanners } from '../../../context/BannerContext';
import Airpods from "../../../assets/images/Airpods.webp";
import banner1 from "../../../assets/images/banner1.avif";
import banner2 from "../../../assets/images/banner2.avif";
import HeroSlider from '../../shared/HeroSlider';

function HeroSection() {
  const { slides, loading: slidesLoading } = useSlider();
  const { banners, loading: bannersLoading } = useBanners();
  
  // Default fallback images
  const defaultImages = {
    'hero-side-top': Airpods,
    'hero-side-bottom-left': banner1,
    'hero-side-bottom-right': banner2
  };
  
  // Function to get banner by position with fallback
  const getBannerByPosition = (position) => {
    if (!banners || banners.length === 0) return null;
    return banners.find(banner => banner.position === position && banner.isActive);
  };

  return (
    <section className='px-6 my-3 pb-5 w-full h-[80vh] flex flex-col md:flex-row items-center justify-between gap-5'>
      {/* Main Slider Section */}
      <div className='w-full md:w-[65%] h-full relative rounded-xl overflow-hidden'>
        <HeroSlider />
      </div>

      {/* Side Banner Section */}
      <div className='w-full md:w-[35%] h-full rounded-xl flex flex-col gap-4'>
        {/* Top Banner */}
        <div className='w-full h-1/2 relative rounded-xl overflow-hidden'>
          {bannersLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Use banner if available, fallback to default image */}
              <img 
                src={getBannerByPosition('hero-side-top')?.imageUrl || defaultImages['hero-side-top']} 
                alt={getBannerByPosition('hero-side-top')?.name || "Wireless Airpods"} 
                className='w-full h-full object-cover'
              />
              <div className='absolute bottom-4 left-4 text-white'>
                <h3 className='text-xl font-bold'>
                  {getBannerByPosition('hero-side-top')?.title || "Wireless Airpods"}
                </h3>
                <p className='text-sm'>
                  {getBannerByPosition('hero-side-top')?.subtitle || "Starting at $99.99"}
                </p>
                {getBannerByPosition('hero-side-top')?.link && (
                  <a 
                    href={getBannerByPosition('hero-side-top').link} 
                    className="mt-2 inline-block text-sm px-3 py-1 bg-white text-black rounded hover:bg-opacity-90"
                  >
                    Shop Now
                  </a>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Bottom Banners */}
        <div className='w-full h-1/2 flex gap-4'>
          {/* Bottom Left Banner */}
          <div className='w-1/2 h-full relative rounded-xl overflow-hidden'>
            {bannersLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                <img 
                  src={getBannerByPosition('hero-side-bottom-left')?.imageUrl || defaultImages['hero-side-bottom-left']} 
                  alt={getBannerByPosition('hero-side-bottom-left')?.name || "Special Offer"} 
                  className='w-full h-full object-cover'
                />
                <div className='absolute bottom-2 left-2 text-white'>
                  <p className='text-xs font-medium'>
                    {getBannerByPosition('hero-side-bottom-left')?.title || "Summer Sale"}
                  </p>
                  {getBannerByPosition('hero-side-bottom-left')?.subtitle && (
                    <p className='text-xs'>{getBannerByPosition('hero-side-bottom-left').subtitle}</p>
                  )}
                  {getBannerByPosition('hero-side-bottom-left')?.link && (
                    <a 
                      href={getBannerByPosition('hero-side-bottom-left').link} 
                      className="mt-1 inline-block text-xs px-2 py-0.5 bg-white text-black rounded hover:bg-opacity-90"
                    >
                      View
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Bottom Right Banner */}
          <div className='w-1/2 h-full relative rounded-xl overflow-hidden'>
            {bannersLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                <img 
                  src={getBannerByPosition('hero-side-bottom-right')?.imageUrl || defaultImages['hero-side-bottom-right']} 
                  alt={getBannerByPosition('hero-side-bottom-right')?.name || "New Arrivals"} 
                  className='w-full h-full object-cover'
                />
                <div className='absolute bottom-2 left-2 text-white'>
                  <p className='text-xs font-medium'>
                    {getBannerByPosition('hero-side-bottom-right')?.title || "New Arrivals"}
                  </p>
                  {getBannerByPosition('hero-side-bottom-right')?.subtitle && (
                    <p className='text-xs'>{getBannerByPosition('hero-side-bottom-right').subtitle}</p>
                  )}
                  {getBannerByPosition('hero-side-bottom-right')?.link && (
                    <a 
                      href={getBannerByPosition('hero-side-bottom-right').link} 
                      className="mt-1 inline-block text-xs px-2 py-0.5 bg-white text-black rounded hover:bg-opacity-90"
                    >
                      View
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;