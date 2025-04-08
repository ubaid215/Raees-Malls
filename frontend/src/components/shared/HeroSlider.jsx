// HeroSlider.jsx
import { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useSlider } from '../../context/SliderContext';

const HeroSlider = () => {
  const { slides } = useSlider();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (slides.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  if (loading) {
    return <div className="w-full h-screen bg-black animate-pulse"></div>;
  }

  if (slides.length === 0) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <p className="text-white">No slides available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div 
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div 
            key={slide.id} 
            className="w-full flex-shrink-0 relative h-full"
          >
            <img 
              src={slide.imageUrl || 'https://via.placeholder.com/1500x500'} // Fallback for missing images
              alt={slide.title} 
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="max-w-4xl text-center px-4">
                <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
                  {slide.title}
                </h1>
                <p className="text-xl md:text-2xl mb-8 text-white">
                  {slide.subtitle}
                </p>
                <a 
                  href={slide.ctaLink}
                  className="inline-block bg-white text-black px-8 py-3 rounded-md font-semibold hover:bg-gray-100 transition duration-300"
                >
                  {slide.ctaText}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {slides.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full z-30 hover:bg-black/70 transition backdrop-blur-sm"
            aria-label="Previous slide"
          >
            <FiChevronLeft size={28} />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full z-30 hover:bg-black/70 transition backdrop-blur-sm"
            aria-label="Next slide"
          >
            <FiChevronRight size={28} />
          </button>
        </>
      )}
      
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-3 z-30">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-4 h-4 rounded-full transition-all ${currentSlide === index ? 'bg-white' : 'bg-white/50 hover:bg-white/70'}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroSlider;