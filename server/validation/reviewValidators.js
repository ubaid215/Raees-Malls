const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

// Validator for adding a review
const addReviewValidator = [
  body('productId')
    .isMongoId().withMessage('Invalid product ID'),
  body('orderId')
    .isMongoId().withMessage('Invalid order ID'),
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

// Validator for getting reviews
const getReviewsValidator = [
  param('productId')
    .isMongoId().withMessage('Invalid product ID'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
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