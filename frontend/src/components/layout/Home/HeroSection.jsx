import React, { useState, useEffect } from 'react';
import { useBanners } from '../../../context/BannerContext';
import Airpods from '../../../assets/images/Airpods.webp';
import banner1 from '../../../assets/images/banner1.avif';
import banner2 from '../../../assets/images/banner2.avif';

function HeroSection() {
  const { banners, loading: bannersLoading } = useBanners();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Get slider banners
  const sliderBanners = banners
    .filter((banner) => banner.position === 'hero-slider' && banner.isActive)
    .map((banner) => ({
      src: banner.image.url,
      alt: banner.image.alt || banner.title,
      title: banner.title,
      subtitle: banner.description || '',
      link: '/products', // Updated to redirect to products page
    }));

  // Fallback slider banners if none exist
  const fallbackSliderBanners = [
    { src: Airpods, alt: 'Summer Collection', title: 'Summer Collection', subtitle: 'Up to 50% off', link: '/products' },
    { src: banner1, alt: 'New Arrivals', title: 'New Arrivals', subtitle: 'Discover the latest trends', link: '/products' },
    { src: banner2, alt: 'Limited Offer', title: 'Limited Time Offer', subtitle: 'Do not miss out', link: '/products' },
  ];

  const activeSliderBanners = sliderBanners.length > 0 ? sliderBanners : fallbackSliderBanners;

  // Auto slide change
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSliderBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSliderBanners.length]);

  return (
    <section className="lg:px-4 md:px-2 sm:px-0 mb-3 pb-5 pt-7 w-full">
      {/* Main Slider Section */}
      <div className="w-full h-[30vh] sm:h-[50vh] md:h-[80vh] relative rounded-none md:rounded-md lg:rounded-xl overflow-hidden">
        <div className="relative w-full h-full">
          {bannersLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="relative w-full h-full overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {activeSliderBanners.map((slide, index) => (
                    <div key={index} className="w-full flex-shrink-0">
                      <a href={slide.link} className="block w-full h-full">
                        <img
                          src={slide.src}
                          alt={slide.alt}
                          className="w-full h-full object-center object-cover"
                        />
                        <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-10">
                          <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-red-500">{slide.title}</h2>
                          {slide.subtitle && <p className="text-lg sm:text-xl mb-3 sm:mb-4 text-blue-500">{slide.subtitle}</p>}
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              {/* Slider indicators */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {activeSliderBanners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full ${
                      index === currentSlide ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default HeroSection;