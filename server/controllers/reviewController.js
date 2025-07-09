const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const mongoose = require('mongoose');

// Add a review
exports.addReview = async (req, res, next) => {
  try {
    const { productId, rating, comment, orderId } = req.body;
    const userId = req.user._id;

    // Validate product
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Verify purchase
    const order = await Order.findOne({ 
      _id: orderId, 
      userId, 
      'items.productId': productId, 
      status: 'delivered' 
    });
    if (!	order) {
      throw new ApiError(403, 'You must purchase and receive this product to review it');
    }

    // Create review
    const review = new Review({
      userId,
      productId,
      orderId,
      rating,
      comment,
      verifiedPurchase: true
    });

    await review.save();
    ApiResponse.success(res, 201, 'Review added successfully', { review });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, 'You have already reviewed this product'));
    }
    next(error);
  }
};

// Get reviews for a product
exports.getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'recent', filter = 'all' } = req.query;

    const skip = (page - 1) * limit;
    let query = { productId, isFlagged: false };
    if (filter === 'verified') query.verifiedPurchase = true;

    let sortOption = { createdAt: -1 }; // Default: most recent
    if (sort === 'highest') sortOption = { rating: -1 };
    else if (sort === 'lowest') sortOption = { rating: 1 };

    const reviews = await Review.find(query)
      .populate('userId', 'email')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);

    // Calculate star breakdown
    const starBreakdown = await Review.aggregate([
      { $match: { productId: mongoose.Types.ObjectId(productId), isFlagged: false } },
      { $group: { _id: '$rating', count: { $sum: 1 } } }
    ]);

    ApiResponse.success(res, 200, 'Reviews retrieved successfully', {
      reviews,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      starBreakdown
    });
  } catch (error) {
    next(error);
  }
};

// Update a review
exports.updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    if (review.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to update this review');
    }

    review.rating = rating;
    review.comment = comment;
    await review.save();

    ApiResponse.success(res, 200, 'Review updated successfully', { review });
  } catch (error) {
    next(error);
  }
};

// Delete a review
exports.deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    if (review.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to delete this review');
    }

    await review.deleteOne();
    ApiResponse.success(res, 200, 'Review deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Get user's reviews
exports.getUserReviews = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const reviews = await Review.find({ userId })
      .populate('productId', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ userId });

    ApiResponse.success(res, 200, 'User reviews retrieved successfully', {
      reviews,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

// Admin flag inappropriate review
exports.flagReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    review.isFlagged = true;
    await review.save();

    ApiResponse.success(res, 200, 'Review flagged successfully');
  } catch (error) {
    next(error);
  }
};

// Admin delete review
exports.adminDeleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    await review.deleteOne();
    ApiResponse.success(res, 200, 'Review deleted successfully by admin');
  } catch (error) {
    next(error);
  }
};