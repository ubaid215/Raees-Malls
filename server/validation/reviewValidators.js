const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

// Validator for adding a review
const addReviewValidator = [
  body('productId')
    .isMongoId().withMessage('Invalid product ID'),
  body('orderId')
    .custom((value) => {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(value);
      const isCustomOrderId = /^ORD-[a-zA-Z0-9]+$/.test(value);
      
      if (!isMongoId && !isCustomOrderId) {
        throw new Error('Invalid order ID format. Must be either MongoDB ObjectId or ORD- format');
      }
      return true;
    }),
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Comment must be less than 1000 characters'),

  // custom middleware for validation handling
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.error("🚨 Validation Failed for /api/reviews");
      console.error("👉 Request Body:", req.body);
      console.error("👉 Validation Errors:", errors.array());

      return next(new ApiError(400, 'Validation failed', errors.array()));
    }

    console.log("✅ Validation Passed for /api/reviews");
    console.log("👉 Request Body:", req.body);

    next();
  }
];

// Validator for getting reviews
const getReviewsValidator = [
  param('productId')
    .custom((value) => {
      // Accept both numeric IDs and MongoDB ObjectIds
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(value);
      const isNumericId = /^\d+$/.test(value);
      
      if (!isMongoId && !isNumericId) {
        throw new Error('Invalid product ID format. Must be either numeric ID or MongoDB ObjectId');
      }
      return true;
    }),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('sort')
    .optional()
    .isIn(['recent', 'highest', 'lowest']).withMessage('Invalid sort option'),
  query('filter')
    .optional()
    .isIn(['all', 'verified']).withMessage('Invalid filter option'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];
// Validator for updating a review
const updateReviewValidator = [
  param('reviewId')
    .isMongoId().withMessage('Invalid review ID'),
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Comment must be less than 1000 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for deleting a review
const deleteReviewValidator = [
  param('reviewId')
    .isMongoId().withMessage('Invalid review ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for getting user reviews
const getUserReviewsValidator = [
  param('userId')
    .isMongoId().withMessage('Invalid user ID'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for flagging a review (admin)
const flagReviewValidator = [
  param('reviewId')
    .isMongoId().withMessage('Invalid review ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for admin deleting a review
const adminDeleteReviewValidator = [
  param('reviewId')
    .isMongoId().withMessage('Invalid review ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

module.exports = {
  addReviewValidator,
  getReviewsValidator,
  updateReviewValidator,
  deleteReviewValidator,
  getUserReviewsValidator,
  flagReviewValidator,
  adminDeleteReviewValidator
};