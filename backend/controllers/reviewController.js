const Review = require('../models/Review');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

const createReview = asyncHandler(async (req, res) => {
  console.log('Request Body:', req.body);
  console.log('Params:', req.params);
  console.log('User:', req.user);

  if (!req.body.rating) {
    return res.status(400).json({
      success: false,
      message: 'Rating is required'
    });
  }

  const reviewData = {
    rating: req.body.rating,
    comment: req.body.comment,
    user: req.user._id,
    product: req.params.productId
  };
  console.log('Review Data to Save:', reviewData);

  const review = await Review.create(reviewData);

  // Update product rating and numReviews
  const reviews = await Review.find({ product: req.params.productId });
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  
  await Product.findByIdAndUpdate(req.params.productId, {
    rating: avgRating,
    numReviews: reviews.length
  });

  res.status(201).json({
    success: true,
    data: review
  });
});

module.exports = { createReview };