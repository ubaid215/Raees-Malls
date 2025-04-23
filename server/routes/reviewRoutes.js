const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { ensureAuthenticated, authorizeRoles } = require('../middleware/auth');
const { addReviewValidator, getReviewsValidator, deleteReviewValidator } = require('../validation/reviewValidators');

// Review routes (under /api/reviews)
router.post('/',
  ensureAuthenticated,
  authorizeRoles('user'),
  addReviewValidator,
  reviewController.addReview
);

router.get('/:productId',
  getReviewsValidator,
  reviewController.getProductReviews
);

router.delete('/:reviewId',
  ensureAuthenticated,
  authorizeRoles('user'),
  deleteReviewValidator,
  reviewController.deleteReview
);

module.exports = router;