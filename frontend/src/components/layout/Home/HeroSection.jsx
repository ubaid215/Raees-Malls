import React, { useState, useEffect, useRef } from 'react';
import { useBanners } from '../../../context/BannerContext';
import Airpods from '../../../assets/images/Airpods.webp';
import banner1 from '../../../assets/images/banner1.avif';
import banner2 from '../../../assets/images/banner2.avif';

function HeroSection() {
  const { banners, loading: bannersLoading } = useBanners();
  const [currentSlide, setCurrentSlide] = useState(0);
  const videoRefs = useRef([]);

  // Get slider banners
  const sliderBanners = banners
    .filter((banner) => banner.position === 'hero-slider' && banner.isActive)
    .sort((a, b) => b.priority - a.priority) // Sort by priority
    .map((banner) => ({
      src: banner.videos?.length > 0 ? banner.videos[0].url : banner.image?.url,
      isVideo: banner.videos?.length > 0,
      alt: banner.image?.alt || 'Banner media',
      link: banner.targetUrl || '/products',
    }));

  // Fallback slider banners if none exist
  const fallbackSliderBanners = [
    { src: Airpods, isVideo: false, alt: 'Summer Collection', link: '/products' },
    { src: banner1, isVideo: false, alt: 'New Arrivals', link: '/products' },
    { src: banner2, isVideo: false, alt: 'Limited Offer', link: '/products' },
  ];

  const activeSliderBanners = sliderBanners.length > 0 ? sliderBanners : fallbackSliderBanners;

  // Handle video play/pause when slide changes
  useEffect(() => {
    // Pause all videos first
    videoRefs.current.forEach(video => {
      if (video) {
        video.pause();
      }
    });
    
    // Play current video if it exists
    if (activeSliderBanners[currentSlide]?.isVideo && videoRefs.current[currentSlide]) {
      videoRefs.current[currentSlide].play().catch(error => {
        console.error('Video play failed:', error);
      });
    }
  }, [currentSlide, activeSliderBanners]);

  // Auto slide change
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSliderBanners.length);
    }, 7000);
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
                    <div key={index} className="w-full flex-shrink-0 relative">
                      <a href={slide.link} className="block w-full h-full">
                        {slide.isVideo ? (
                          <video
                            ref={el => videoRefs.current[index] = el}
                            src={slide.src}
                            autoPlay={index === currentSlide}
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-center object-cover"
                            onLoadedMetadata={() => {
                              if (index === currentSlide) {
                                videoRefs.current[index]?.play().catch(console.error);
                              }
                            }}
                          />
                        ) : (
                          <img
                            src={slide.src}
                            alt={slide.alt}
                            className="w-full h-full object-center object-cover"
                            loading="lazy"
                          />
                        )}
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
                    className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full transition-all duration-300 ${
                      index === currentSlide ? 'bg-white w-4 sm:w-6' : 'bg-white bg-opacity-50'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              
              {/* Navigation arrows */}
              <button
                onClick={() => setCurrentSlide(prev => (prev - 1 + activeSliderBanners.length) % activeSliderBanners.length)}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white p-2 rounded-full hover:bg-opacity-50 transition-all"
                aria-label="Previous slide"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentSlide(prev => (prev + 1) % activeSliderBanners.length)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white p-2 rounded-full hover:bg-opacity-50 transition-all"
                aria-label="Next slide"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default HeroSection;