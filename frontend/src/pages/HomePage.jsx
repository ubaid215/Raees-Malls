import React, { useState } from 'react';
import MiniBanner from '../components/layout/MiniBanner';
import HeroSection from '../components/layout/Home/HeroSection';
import FeaturedProducts from '../components/Products/FeaturedProducts';
import ProductRowSlider from '../components/Products/ProductRowSlider';

// WhatsApp Icon Component
const WhatsAppIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516"
      fill="currentColor"
    />
  </svg>
);

// WhatsApp Float Button Component
const WhatsAppFloatButton = () => {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 600);
    
    // WhatsApp redirect
    const phoneNumber = "923006530063"; // Remove + and spaces for URL
    const message = "Hi, I'm from raeesmalls.com and want to know more about your services and products."; // Optional pre-filled message
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Ripple Effect Container */}
      <div className="relative">
        {/* Animated Ripples */}
        <div className="absolute inset-0 -m-2">
          <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></div>
          <div className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-50 animation-delay-200"></div>
        </div>
        
        {/* Click Ripple Effect */}
        {isClicked && (
          <div className="absolute inset-0 -m-4">
            <div className="absolute inline-flex h-full w-full rounded-full bg-green-300 animate-ping opacity-75"></div>
          </div>
        )}
        
        {/* Main Button */}
        <button
          onClick={handleClick}
          className="relative bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group"
          aria-label="Contact us on WhatsApp"
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Icon */}
          <div className="relative z-10 transform group-hover:rotate-12 transition-transform duration-300">
            <WhatsAppIcon />
          </div>
          
          {/* Shine Effect */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-white opacity-30 rounded-full group-hover:animate-bounce"></div>
          </div>
        </button>
        
        {/* Quick Contact Label */}
        <div className="absolute bottom-full mb-4 left-1/3 transform -translate-x-1/2 bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-medium shadow-lg border border-gray-200 whitespace-nowrap">
          Quick contact us.
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
        </div>
        
        {/* Hover Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          Chat with us on WhatsApp
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-800"></div>
        </div>
      </div>
    </div>
  );
};

function HomePage() {
  return (
    <div className='bg-[#F5F5F5] relative'>
      <MiniBanner />
      <HeroSection />
      <FeaturedProducts />
      <ProductRowSlider title="New Products" />
      
      {/* WhatsApp Float Button */}
      <WhatsAppFloatButton />
    </div>
  );
}

export default HomePage;