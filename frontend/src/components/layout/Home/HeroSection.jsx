import React, { useState, useEffect } from 'react';
import { useBanners } from '../../../context/BannerContext';
import Airpods from "../../../assets/images/Airpods.webp";
import banner1 from "../../../assets/images/banner1.avif";
import banner2 from "../../../assets/images/banner2.avif";

// Dummy images for the slider
import dummy1 from "../../../assets/images/electronics.webp";
import dummy2 from "../../../assets/images/headphone1.webp";
import dummy3 from "../../../assets/images/headphone.webp";

function HeroSection() {
  const { banners, loading: bannersLoading } = useBanners();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Dummy slider images data
  const sliderImages = [
    { src: dummy1, alt: "Summer Collection", title: "Summer Collection", subtitle: "Up to 50% off" },
    { src: dummy2, alt: "New Arrivals", title: "New Arrivals", subtitle: "Discover the latest trends" },
    { src: dummy3, alt: "Limited Offer", title: "Limited Time Offer", subtitle: "Don't miss out" }
  ];

  // Default fallback images
  const defaultImages = {
    'hero-side-top': Airpods,
    'hero-side-bottom-left': banner1,
    'hero-side-bottom-right': banner2
  };

  // Auto slide change
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [sliderImages.length]);

  // Function to get banner by position with fallback
  const getBannerByPosition = (position) => {
    if (!banners || banners.length === 0) return null;
    return banners.find(banner => banner.position === position && banner.isActive);
  };

  return (
    <section className='px-6 mb-3 pb-5 pt-7 w-full h-[80vh] flex flex-col md:flex-row items-center justify-between gap-5'>
      {/* Main Slider Section */}
      <div className='w-full md:w-[65%] h-full relative rounded-xl overflow-hidden'>
        <div className="relative w-full h-full">
          {sliderImages.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-10 left-10 text-white">
                <h2 className="text-3xl font-bold mb-2">{slide.title}</h2>
                <p className="text-xl mb-4">{slide.subtitle}</p>
                <button className="px-6 py-2 bg-white text-black rounded-md hover:bg-opacity-90 transition">
                  Shop Now
                </button>
              </div>
            </div>
          ))}
          {/* Slider indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {sliderImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full ${
                  index === currentSlide ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
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