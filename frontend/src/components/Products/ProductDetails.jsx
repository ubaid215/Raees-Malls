// 📁 pages/ProductDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiHeart } from 'react-icons/fi';
import { FaStar, FaRegStar } from 'react-icons/fa';
import Button from '../core/Button';
import useProduct from '../../hooks/useProduct';
import LoadingSpinner from '../core/LoadingSpinner';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext'; // Import AuthContext
import axios from 'axios';

const ProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { product: rawProduct, loading, error } = useProduct(productId);
  const { addToCart } = useCart();
  const { user } = useAuth(); // Get authenticated user
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('Green');
  const [selectedStorage, setSelectedStorage] = useState('256GB');
  const [selectedShipping, setSelectedShipping] = useState('Shipping - $19');
  const [selectedWarranty, setSelectedWarranty] = useState('1 year - $39');
  const [rating, setRating] = useState(0); // Review rating state
  const [comment, setComment] = useState(''); // Review comment state
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Format product data
  const product = rawProduct
    ? {
        ...rawProduct,
        id: rawProduct._id,
        images: rawProduct.images.map((img) => `http://localhost:5000${img}`),
      }
    : null;

  // Handle review submission
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setReviewError('Please log in to submit a review.');
      return;
    }
    if (!rating) {
      setReviewError('Please select a rating.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/reviews/${productId}`,
        { rating, comment },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      setReviewSuccess('Review submitted successfully!');
      setRating(0);
      setComment('');
      setReviewError('');
      // Update product rating and numReviews locally
      const updatedReviews = (product.numReviews || 0) + 1;
      const updatedRating = ((product.rating || 0) * product.numReviews + rating) / updatedReviews;
      rawProduct.rating = updatedRating;
      rawProduct.numReviews = updatedReviews;
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Failed to submit review.');
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (error) return <div className="text-center py-12 text-red-600">Error loading product: {error}</div>;
  if (!product) return <div className="text-center py-12">Product not found</div>;

  const handleImageSelect = (index) => {
    setCurrentImageIndex(index);
  };

  const handleAddToCart = () => {
    addToCart({
      id: productId,
      name: product.title,
      price: product.price,
      quantity: 1,
      image: product.images[0],
      color: selectedColor,
      storage: selectedStorage,
    });
  };

  const handleOrderNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  const colors = ['Green', 'Pink', 'Silver', 'Blue'];
  const storageOptions = ['256GB', '512GB', '1TB'];
  const shippingOptions = [
    'Shipping - $19',
    'Arrives Nov 17',
    'Pickup from Flowbox - $9',
    'Pickup from our store',
  ];
  const warrantyOptions = ['1 year - $39', '2 years - $99', '3 years - $991'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-gray-600 mb-6 animate-slideInLeft">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center mr-2 hover:text-blue-600 transition-colors duration-200"
        >
          <FiChevronLeft className="mr-1" /> Back
        </button>
        <span className="mx-1">/</span>
        <button
          onClick={() => navigate('/')}
          className="hover:text-blue-600 transition-colors duration-200"
        >
          Home
        </button>
        <span className="mx-1">/</span>
        <button
          onClick={() => navigate('/products')}
          className="hover:text-blue-600 transition-colors duration-200"
        >
          Products
        </button>
        <span className="mx-1">/</span>
        <span className="text-gray-900">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="flex flex-col sm:flex-row gap-4 animate-slideInLeft">
          {/* Thumbnail Gallery */}
          <div className="flex sm:flex-col gap-2 order-2 sm:order-1">
            {product.images.map((img, index) => (
              <button
                key={index}
                onClick={() => handleImageSelect(index)}
                className={`w-20 h-20 rounded-md overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                  currentImageIndex === index ? 'border-blue-600' : 'border-gray-200'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.target.src = '/placeholder-product.png')}
                />
              </button>
            ))}
          </div>

          {/* Main Image */}
          <div className="relative flex-1 h-96 bg-gray-100 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl order-1 sm:order-2">
            <img
              src={product.images[currentImageIndex]}
              alt={product.title}
              className="w-full h-full object-contain transition-opacity duration-300"
              onError={(e) => (e.target.src = '/placeholder-product.png')}
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="animate-slideInRight">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{product.title}</h1>

          {/* Rating Display */}
          <div className="flex items-center mb-4">
            <div className="flex items-center text-yellow-400 mr-2">
              {[...Array(5)].map((_, i) => (
                i < Math.floor(product.rating || 0) ? (
                  <FaStar key={i} className="w-5 h-5" />
                ) : (
                  <FaRegStar key={i} className="w-5 h-5 text-gray-300" />
                )
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {product.rating?.toFixed(1)} ({product.numReviews || 0} Reviews)
            </span>
          </div>

          <div className="mb-4">
            <span className="text-2xl font-bold text-gray-900">PKR {product.price.toFixed(2)}</span>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Deliver to <span className="text-blue-600">Bonnie Green - Sacramento 23647</span>
            </p>
          </div>

          {/* Color Selection */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Colour</h3>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`px-4 py-2 rounded-md border text-sm transition-all duration-200 ${
                    selectedColor === color
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 text-gray-600 hover:border-blue-600'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Storage Selection */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">SSD Capacity</h3>
            <div className="flex gap-2">
              {storageOptions.map((storage) => (
                <button
                  key={storage}
                  onClick={() => setSelectedStorage(storage)}
                  className={`px-4 py-2 rounded-md border text-sm transition-all duration-200 ${
                    selectedStorage === storage
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 text-gray-600 hover:border-blue-600'
                  }`}
                >
                  {storage}
                </button>
              ))}
            </div>
          </div>

          {/* Shipping Options */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Pickup</h3>
            <div className="space-y-2">
              {shippingOptions.map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    name="shipping"
                    checked={selectedShipping === option}
                    onChange={() => setSelectedShipping(option)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Warranty Options */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Add extra warranty</h3>
            <div className="space-y-2">
              {warrantyOptions.map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    name="warranty"
                    checked={selectedWarranty === option}
                    onChange={() => setSelectedWarranty(option)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center border border-gray-300 rounded-md">
              <button className="px-3 py-2 text-gray-600">-</button>
              <span className="px-4 py-2 text-gray-900">1</span>
              <button className="px-3 py-2 text-gray-600">+</button>
            </div>
            <Button
              variant="primary"
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
              onClick={handleAddToCart}
            >
              Add to cart
            </Button>
            <button className="p-2 border border-gray-300 rounded-md hover:border-blue-600 transition-all duration-200">
              <FiHeart className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <Button
            variant="primary"
            className="w-full bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
            onClick={handleOrderNow}
          >
            Order Now
          </Button>

          {/* Product Details */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Product Details</h3>
            <p className="text-gray-600 text-sm">{product.description}</p>
          </div>

          {/* Review Section */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Write a Review</h3>
            {user ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rating</label>
                  <div className="flex space-x-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        onClick={() => setRating(star)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Comment</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    placeholder="Your review..."
                  />
                </div>
                {reviewError && <p className="text-red-500 text-sm">{reviewError}</p>}
                {reviewSuccess && <p className="text-green-500 text-sm">{reviewSuccess}</p>}
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  Submit Review
                </Button>
              </form>
            ) : (
              <p className="text-gray-600">
                Please{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:underline"
                >
                  log in
                </button>{' '}
                to submit a review.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;