import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiShare2, FiHeart } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import Button from '../components/core/Button';
import useProduct from '../hooks/useProduct'; 
import LoadingSpinner from '../components/core/LoadingSpinner';
import { useCart } from '../context/CartContext';

const ProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { product, loading, error } = useProduct(productId);
  const { addToCart } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (loading) return <LoadingSpinner fullScreen />;
  if (error) return <div className="text-center py-12 text-red-600">Error loading product</div>;
  if (!product) return <div className="text-center py-12">Product not found</div>;

  const handlePrevImage = () => {
    setCurrentImageIndex(prev => 
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => 
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  };

  const handleWhatsAppClick = () => {
    const message = `I'm interested in ${product.title} (${window.location.href})`;
    const phoneNumber = '03007246696'; // Raees Malls number
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleOrderNow = () => {
    addToCart({
      id: productId,
      name: product.title,
      price: product.price,
      quantity: 1,
      image: product.images[0],
    });
    navigate('/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-gray-600 mb-6 animate-slideInLeft">
        <button onClick={() => navigate(-1)} className="flex items-center mr-2 hover:text-red-600 transition-colors duration-200">
          <FiChevronLeft className="mr-1" /> Back
        </button>
        <span className="mx-1">/</span>
        <button onClick={() => navigate('/')} className="hover:text-red-600 transition-colors duration-200">
          Home
        </button>
        <span className="mx-1">/</span>
        <button onClick={() => navigate('/products')} className="hover:text-red-600 transition-colors duration-200">
          Products
        </button>
        <span className="mx-1">/</span>
        <span className="text-gray-900">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Carousel */}
        <div className="relative animate-slideInLeft">
          <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
            <img
              src={product.images[currentImageIndex]}
              alt={product.title}
              className="w-full h-full object-contain transition-opacity duration-300"
            />
            
            {/* Navigation Arrows */}
            {product.images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-md hover:bg-white transition-all duration-200 hover:scale-110"
                  aria-label="Previous image"
                >
                  <FiChevronLeft className="h-5 w-5 text-gray-800" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-md hover:bg-white transition-all duration-200 hover:scale-110"
                  aria-label="Next image"
                >
                  <FiChevronRight className="h-5 w-5 text-gray-800" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {product.images.length > 1 && (
            <div className="flex mt-4 space-x-2 overflow-x-auto py-2">
              {product.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${currentImageIndex === index ? 'border-red-600 scale-105' : 'border-transparent'}`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="animate-slideInRight">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
          
          <div className="flex items-center mb-4">
            <div className="flex items-center text-yellow-400 mr-2">
              {[1, 2, 3, 4].map((star) => (
                <svg key={star} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <svg className="w-5 h-5 text-gray-300" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <span className="text-sm text-gray-600">(24 reviews)</span>
          </div>

          <div className="mb-6">
            <span className="text-2xl font-bold text-gray-900">${product.price.toFixed(2)}</span>
            {product.originalPrice && (
              <span className="ml-2 text-lg text-gray-500 line-through">${product.originalPrice.toFixed(2)}</span>
            )}
          </div>

          <div className="prose text-gray-600 mb-6">
            <p>{product.description}</p>
            
            {product.highlights && (
              <div className="mt-4">
                <h3 className="font-semibold text-gray-900">Highlights:</h3>
                <ul className="list-disc pl-5">
                  {product.highlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
            <Button 
              variant="primary" 
              className="flex-1 transform transition-all duration-300 hover:scale-105"
              onClick={handleOrderNow}
            >
              Order Now
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 flex items-center justify-center transform transition-all duration-300 hover:scale-105"
              onClick={handleWhatsAppClick}
            >
              <FaWhatsapp className="mr-2 text-green-500" size={20} />
              WhatsApp
            </Button>
          </div>

          {/* Additional Actions */}
          <div className="flex space-x-4 mt-4">
            <button className="flex items-center text-gray-600 hover:text-red-600 transition-colors duration-200 hover:scale-110">
              <FiHeart className="mr-2" /> Save
            </button>
            <button className="flex items-center text-gray-600 hover:text-red-600 transition-colors duration-200 hover:scale-110">
              <FiShare2 className="mr-2" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;