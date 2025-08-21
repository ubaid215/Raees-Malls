const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateJWT, ensureAuthenticated, authorizeRoles } = require('../middleware/auth');
const { 
  addReviewValidator, 
  getReviewsValidator, 
  updateReviewValidator, 
  deleteReviewValidator, 
  getUserReviewsValidator,
  flagReviewValidator,
  adminDeleteReviewValidator 
} = require('../validation/reviewValidators');

// Public routes - no authentication needed
router.get('/:productId',
  getReviewsValidator,
  reviewController.getProductReviews
);

// Protected routes - require authentication
router.post('/',
  authenticateJWT, // Use JWT auth for API
  authorizeRoles('user'),
  addReviewValidator,
  reviewController.addReview
);

router.put('/:reviewId',
  authenticateJWT,
  authorizeRoles('user'),
  updateReviewValidator,
  reviewController.updateReview
);

router.delete('/:reviewId',
  authenticateJWT,
  authorizeRoles('user'),
  deleteReviewValidator,
  reviewController.deleteReview
);

router.get('/user/:userId',
  authenticateJWT,
  authorizeRoles('user'),
  getUserReviewsValidator,
  reviewController.getUserReviews
);

// Admin routes - use session auth for CMS
router.post('/flag/:reviewId',
  ensureAuthenticated, // Use session auth for admin panel
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