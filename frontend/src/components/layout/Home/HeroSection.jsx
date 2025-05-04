import React, { useState, useEffect } from 'react';
import { useBanners } from '../../../context/BannerContext';
import Airpods from '../../../assets/images/Airpods.webp';
import banner1 from '../../../assets/images/banner1.avif';
import banner2 from '../../../assets/images/banner2.avif';

function HeroSection() {
  const { banners, loading: bannersLoading } = useBanners();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Default fallback images
  const defaultImages = {
    'hero-side-top': { src: Airpods, alt: 'Wireless Airpods', title: 'Wireless Airpods', subtitle: 'Starting at $99.99' },
    'hero-side-bottom-left': { src: banner1, alt: 'Special Offer', title: 'Summer Sale' },
    'hero-side-bottom-right': { src: banner2, alt: 'New Arrivals', title: 'New Arrivals' },
  };

  // Get slider banners
  const sliderBanners = banners
    .filter((banner) => banner.position === 'hero-slider' && banner.isActive)
    .map((banner) => ({
      src: banner.image.url,
      alt: banner.image.alt || banner.title,
      title: banner.title,
      subtitle: banner.description || '',
      link: banner.targetUrl || '#',
    }));

  // Fallback slider banners if none exist
  const fallbackSliderBanners = [
    { src: Airpods, alt: 'Summer Collection', title: 'Summer Collection', subtitle: 'Up to 50% off', link: '#' },
    { src: banner1, alt: 'New Arrivals', title: 'New Arrivals', subtitle: 'Discover the latest trends', link: '#' },
    { src: banner2, alt: 'Limited Offer', title: 'Limited Time Offer', subtitle: 'Don’t miss out', link: '#' },
  ];

  const activeSliderBanners = sliderBanners.length > 0 ? sliderBanners : fallbackSliderBanners;

  // Get banner by position for side banners
  const getBannerByPosition = (position) => {
    const banner = banners.find((banner) => banner.position === position && banner.isActive);
    return banner;
  };

  // Auto slide change
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSliderBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSliderBanners.length]);

  return (
    <section className="px-4 sm:px-6 mb-3 pb-5 pt-7 w-full flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-5">
      {/* Main Slider Section */}
      <div className="w-full md:w-[65%] h-[30vh] sm:h-[50vh] md:h-[80vh] relative rounded-xl overflow-hidden">
        <div className="relative w-full h-full">
          {bannersLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {activeSliderBanners.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <img src={slide.src} alt={slide.alt} className="w-full h-full object-cover" />
                  <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-10">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-red-500">{slide.title}</h2>
                    {slide.subtitle && <p className="text-lg sm:text-xl mb-3 sm:mb-4 text-blue-500">{slide.subtitle}</p>}
                    <a
                      href={slide.link}
                      className="px-4 sm:px-6 py-1.5 sm:py-2 bg-white text-gray-900 rounded-md hover:bg-opacity-90 transition text-sm sm:text-base"
                    >
                      Shop Now
                    </a>
                  </div>
                </div>
              ))}
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

      {/* Side Banner Section */}
      <div className="w-full md:w-[35%] flex flex-col gap-4 h-[30vh] md:h-[80vh]">
        {/* Top Banner */}
        <div className="w-full h-1/2 relative rounded-xl overflow-hidden">
          {bannersLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <div className="animate-spin rounded-full h-6 sm:h-8 w-6 sm:w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {(() => {
                const banner = getBannerByPosition('hero-side-top');
                const fallback = defaultImages['hero-side-top'];
                return (
                  <>
                    <img
                      src={banner ? banner.image.url : fallback.src}
                      alt={banner ? banner.image.alt || banner.title : fallback.alt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4">
                      <h3 className="text-base sm:text-xl font-bold text-yellow-500">{banner ? banner.title : fallback.title}</h3>
                      {banner?.description || fallback.subtitle ? (
                        <p className="text-xs sm:text-sm text-green-500">{banner ? banner.description : fallback.subtitle}</p>
                      ) : null}
                      {(banner?.targetUrl || fallback.link) && (
                        <a
                          href={banner ? banner.targetUrl : fallback.link}
                          className="mt-1 sm:mt-2 inline-block text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 bg-white text-gray-900 rounded hover:bg-opacity-90"
                        >
                          Shop Now
                        </a>
                      )}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>

        {/* Bottom Banners */}
        <div className="w-full h-1/2 flex gap-4">
          {/* Bottom Left Banner */}
          <div className="w-1/2 h-full relative rounded-xl overflow-hidden">
            {bannersLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <div className="animate-spin rounded-full h-4 sm:h-6 w-4 sm:w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {(() => {
                  const banner = getBannerByPosition('hero-side-bottom-left');
                  const fallback = defaultImages['hero-side-bottom-left'];
                  return (
                    <>
                      <img
                        src={banner ? banner.image.url : fallback.src}
                        alt={banner ? banner.image.alt || banner.title : fallback.alt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2">
                        <p className="text-[10px] sm:text-xs font-medium text-orange-500">{banner ? banner.title : fallback.title}</p>
                        {banner?.description || fallback.subtitle ? (
                          <p className="text-[10px] sm:text-xs text-purple-500">{banner ? banner.description : fallback.subtitle}</p>
                        ) : null}
                        {(banner?.targetUrl || fallback.link) && (
                          <a
                            href={banner ? banner.targetUrl : fallback.link}
                            className="mt-0.5 sm:mt-1 inline-block text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-white text-gray-900 rounded hover:bg-opacity-90"
                          >
                            View
                          </a>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>

          {/* Bottom Right Banner */}
          <div className="w-1/2 h-full relative rounded-xl overflow-hidden">
            {bannersLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <div className="animate-spin rounded-full h-4 sm:h-6 w-4 sm:w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {(() => {
                  const banner = getBannerByPosition('hero-side-bottom-right');
                  const fallback = defaultImages['hero-side-bottom-right'];
                  return (
                    <>
                      <img
                        src={banner ? banner.image.url : fallback.src}
                        alt={banner ? banner.image.alt || banner.title : fallback.alt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2">
                        <p className="text-[10px] sm:text-xs font-medium text-orange-500">{banner ? banner.title : fallback.title}</p>
                        {banner?.description || fallback.subtitle ? (
                          <p className="text-[10px] sm:text-xs text-purple-500">{banner ? banner.description : fallback.subtitle}</p>
                        ) : null}
                        {(banner?.targetUrl || fallback.link) && (
                          <a
                            href={banner ? banner.targetUrl : fallback.link}
                            className="mt-0.5 sm:mt-1 inline-block text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-white text-gray-900 rounded hover:bg-opacity-90"
                          >
                            View
                          </a>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;