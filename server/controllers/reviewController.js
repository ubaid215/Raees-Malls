const Review = require('../models/Review');
const Product = require('../models/Product');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// Add a review
exports.addReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user._id;

    // Validate product
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Create review
    const review = new Review({
      userId,
      productId,
      rating,
      comment
    });

    await review.save();

    // Update product's average rating and numReviews
    const reviews = await Review.find({ productId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    product.averageRating = avgRating;
    product.numReviews = reviews.length;
    await product.save();

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
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const reviews = await Review.find({ productId })
      .populate('userId', 'email')
      .sort('-date')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ productId });

    ApiResponse.success(res, 200, 'Reviews retrieved successfully', {
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

    // Update product's average rating and numReviews
    const reviews = await Review.find({ productId: review.productId });
    const product = await Product.findById(review.productId);
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      product.averageRating = avgRating;
      product.numReviews = reviews.length;
    } else {
      product.averageRating = 0;
      product.numReviews = 0;
    }
    await product.save();

    ApiResponse.success(res, 200, 'Review deleted successfully');
  } catch (error) {
    next(error);
  }
};