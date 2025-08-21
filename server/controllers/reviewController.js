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
    const userId = req.user.userId;

    console.log("📝 Incoming Review Request:");
    console.log("👉 User ID:", userId);
    console.log("👉 Body:", req.body);

    // Validate product
    const product = await Product.findById(productId);
    if (!product) {
      console.error("❌ Product not found:", productId);
      throw new ApiError(404, 'Product not found');
    }
    console.log("✅ Product found:", productId);

    // Build query based on orderId format
    let orderQuery;
    if (/^[0-9a-fA-F]{24}$/.test(orderId)) {
      // MongoDB ObjectId format
      orderQuery = { _id: orderId, userId, 'items.productId': productId, status: 'delivered' };
    } else {
      // Custom order ID format (ORD-...)
      orderQuery = { orderId, userId, 'items.productId': productId, status: 'delivered' };
    }

    // Verify purchase
    const order = await Order.findOne(orderQuery);
    if (!order) {
      console.error("❌ Order validation failed. Order not found or not delivered.");
      console.error("👉 OrderId:", orderId, "UserId:", userId, "ProductId:", productId);
      throw new ApiError(403, 'You must purchase and receive this product to review it');
    }
    console.log("✅ Order verified:", orderId);

    // Check for existing review
    const existingReview = await Review.findOne({ userId, productId });
    if (existingReview) {
      console.error("⚠️ Duplicate review detected. User already reviewed this product.");
      throw new ApiError(400, 'You have already reviewed this product');
    }

    // Create review
    const review = new Review({
      userId,
      productId,
      orderId: order._id, // Always store the MongoDB ObjectId
      rating,
      comment,
      verifiedPurchase: true
    });

    await review.save();
    console.log("✅ Review saved successfully:", review._id);

    ApiResponse.success(res, 201, 'Review added successfully', { review });
  } catch (error) {
    console.error("🚨 Error in addReview:", error);
    next(error);
  }
};


// Get reviews for a product
exports.getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'recent', filter = 'all' } = req.query;

    console.log("📥 Incoming request to getProductReviews");
    console.log("🔹 Params:", req.params);
    console.log("🔹 Query:", req.query);

    // Determine if productId is numeric or MongoDB ObjectId
    let productQuery;
    if (/^\d+$/.test(productId)) {
      console.log("🔎 Detected numeric productId:", productId);
      productQuery = { numericId: parseInt(productId) };
    } else {
      console.log("🔎 Detected ObjectId productId:", productId);
      productQuery = { _id: new mongoose.Types.ObjectId(productId) };
    }

    // First, find the product
    const product = await Product.findOne(productQuery);
    if (!product) {
      console.warn("⚠️ Product not found with query:", productQuery);
      throw new ApiError(404, 'Product not found');
    }
    console.log("✅ Product found:", product._id.toString());

    // Build review query - removed status filter since it doesn't exist in schema
    let reviewQuery = { 
      productId: product._id,
      isFlagged: false  // Only exclude flagged reviews
    };
    
    if (filter === 'verified') {
      reviewQuery.verifiedPurchase = true;
      console.log("🔹 Applied filter: verified purchase only");
    }

    // Build sort
    let sortOption = {};
    switch (sort) {
      case 'highest':
        sortOption = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortOption = { rating: 1, createdAt: -1 };
        break;
      case 'recent':
      default:
        sortOption = { createdAt: -1 };
        break;
    }
    console.log("🔹 Sort option:", sortOption);

    const skip = (page - 1) * limit;

    // Fetch reviews
    const reviews = await Review.find(reviewQuery)
      .populate('userId', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`✅ Retrieved ${reviews.length} reviews (page: ${page}, limit: ${limit})`);

    const total = await Review.countDocuments(reviewQuery);
    console.log("📊 Total reviews:", total);

    // Average rating - removed status filter
    const averageResult = await Review.aggregate([
      { $match: { productId: product._id, isFlagged: false } },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } }
    ]);
    
    const averageRating = averageResult.length > 0 ? averageResult[0].averageRating : 0;
    console.log("⭐ Average rating:", averageRating);

    // Star breakdown - removed status filter
    const starBreakdown = await Review.aggregate([
      { $match: { productId: product._id, isFlagged: false } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);
    console.log("🌟 Star breakdown:", starBreakdown);

    // Send success response
    ApiResponse.success(res, 200, 'Reviews retrieved successfully', {
      reviews,
      total,
      averageRating: Math.round(averageRating * 10) / 10,
      starBreakdown,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("🚨 Error in getProductReviews:", error);
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

    // Authorization check: Only allow users to view their own reviews or admins to view any
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to view these reviews');
    }

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