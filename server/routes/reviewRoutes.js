const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { ensureAuthenticated, authorizeRoles } = require('../middleware/auth');
const { 
  addReviewValidator, 
  getReviewsValidator, 
  updateReviewValidator, 
  deleteReviewValidator, 
  getUserReviewsValidator,
  flagReviewValidator,
  adminDeleteReviewValidator 
} = require('../validation/reviewValidators');

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

router.put('/:reviewId',
  ensureAuthenticated,
  authorizeRoles('user'),
  updateReviewValidator,
  reviewController.updateReview
);

router.delete('/:reviewId',
  ensureAuthenticated,
  authorizeRoles('user'),
  deleteReviewValidator,
  reviewController.deleteReview
);

router.get('/user/:userId',
  ensureAuthenticated,
  authorizeRoles('user'),
  getUserReviewsValidator,
  reviewController.getUserReviews
);

router.post('/flag/:reviewId',
  ensureAuthenticated,
  authorizeRoles('admin'),
  flagReviewValidator,
  reviewController.flagReview
);

router.delete('/admin/:reviewId',
  ensureAuthenticated,
  authorizeRoles('admin'),
  adminDeleteReviewValidator,
  reviewController.adminDeleteReview
);

module.exports = router;