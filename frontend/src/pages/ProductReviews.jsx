import React, { useState, useEffect } from 'react';
import { Star, ChevronDown, Filter, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';
import { useReview } from '../context/ReviewContext';

const ProductReviews = ({ productId }) => {
  const { reviews, reviewData, loading, error, fetchReviews } = useReview();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [starBreakdown, setStarBreakdown] = useState({});
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

  // Calculate stats from actual reviews data
  const calculateReviewStats = (reviewsData) => {
    if (!reviewsData || reviewsData.length === 0) {
      setTotalReviews(0);
      setAverageRating(0);
      setStarBreakdown({});
      return;
    }

    // Calculate total reviews
    const total = reviewsData.length;
    setTotalReviews(total);

    // Calculate average rating
    const sum = reviewsData.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / total;
    setAverageRating(Number(average.toFixed(1)));

    // Calculate star breakdown
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviewsData.forEach(review => {
      if (breakdown[review.rating] !== undefined) {
        breakdown[review.rating]++;
      }
    });
    setStarBreakdown(breakdown);
  };

  // Load reviews using context
  const loadReviews = async (page = 1) => {
    try {
      const response = await fetchReviews(productId, page, 10, sortBy, filterBy);
      
      if (response && typeof response === 'object') {
        // console.log('ProductReviews: Received response:', response);
        setTotalPages(response.totalPages || 1);
        
        // Use response data if available, otherwise calculate from reviews
        if (response.total !== undefined && response.averageRating !== undefined && response.starBreakdown) {
          setTotalReviews(response.total);
          setAverageRating(response.averageRating);
          
          const breakdown = {};
          if (response.starBreakdown && response.starBreakdown.length > 0) {
            response.starBreakdown.forEach(item => {
              breakdown[item._id] = item.count;
            });
          }
          setStarBreakdown(breakdown);
        }
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    }
  };

  // Update stats when reviews change
  useEffect(() => {
    if (reviews && reviews.length > 0) {
      calculateReviewStats(reviews);
    } else if (reviews && reviews.length === 0) {
      // If reviews array exists but is empty, reset stats
      calculateReviewStats([]);
    }
  }, [reviews]);

  useEffect(() => {
    loadReviews(currentPage);
  }, [productId, currentPage, sortBy, filterBy]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating, size = 'w-4 h-4') => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getProgressWidth = (rating) => {
    const count = starBreakdown[rating] || 0;
    return totalReviews > 0 ? (count / totalReviews) * 100 : 0;
  };

  const filteredReviews = (reviews || []).filter(review => {
    if (ratingFilter === 'all') return true;
    return review.rating === parseInt(ratingFilter);
  });

  // Debug logging
  // useEffect(() => {
  //   console.log('Debug - Reviews:', reviews);
  //   console.log('Debug - Total Reviews:', totalReviews);
  //   console.log('Debug - Average Rating:', averageRating);
  //   console.log('Debug - Star Breakdown:', starBreakdown);
  // }, [reviews, totalReviews, averageRating, starBreakdown]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading reviews: {error}</p>
          <button 
            onClick={() => loadReviews(currentPage)}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer Reviews</h2>
        
        {/* Rating Summary */}
        <div className="grid md:grid-cols-2 gap-8 mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {averageRating > 0 ? averageRating : '0'}
              </div>
              <div className="flex justify-center mb-1">
                {renderStars(Math.round(averageRating), 'w-5 h-5')}
              </div>
              <div className="text-sm text-gray-500">
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </div>
            </div>
          </div>
          
          {/* Star Breakdown */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center space-x-2">
                <button
                  onClick={() => setRatingFilter(rating.toString())}
                  className={`flex items-center space-x-1 text-sm hover:text-blue-600 ${
                    ratingFilter === rating.toString() ? 'text-blue-600 font-medium' : 'text-gray-600'
                  }`}
                >
                  <span>{rating}</span>
                  <Star className="w-3 h-3 fill-current" />
                </button>
                <div className="flex-1 h-2 bg-gray-200 rounded-full mx-2">
                  <div
                    className="h-2 bg-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressWidth(rating)}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-8">
                  {starBreakdown[rating] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="recent">Most Recent</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
        </select>
        
        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Reviews</option>
          <option value="verified">Verified Purchases Only</option>
        </select>
        
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
        
        {ratingFilter !== 'all' && (
          <button
            onClick={() => setRatingFilter('all')}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {!reviews || reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No reviews available for this product yet.</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No reviews found matching your criteria.</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {review.userId?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {review.userId?.email?.split('@')[0] || 'Anonymous'}
                    </p>
                    <div className="flex items-center space-x-2">
                      {renderStars(review.rating)}
                      {review.verifiedPurchase && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(review.createdAt)}
                </span>
              </div>
              
              <p className="text-gray-700 mb-4 leading-relaxed">{review.comment}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-4">
                  <button className="flex items-center space-x-1 text-gray-500 hover:text-green-600 transition-colors">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm">Helpful ({review.helpfulCount || 0})</span>
                  </button>
                  <button className="flex items-center space-x-1 text-gray-500 hover:text-red-600 transition-colors">
                    <ThumbsDown className="w-4 h-4" />
                    <span className="text-sm">Not helpful ({review.unhelpfulCount || 0})</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <p className="text-sm text-gray-700">
            Showing page {currentPage} of {totalPages}
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductReviews;