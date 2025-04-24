const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

// Validator for uploading/updating banners
const bannerValidator = [
  body('title')
    .trim().notEmpty().withMessage('Title is required'),
  body('description')
    .optional().trim(),
  body('targetUrl')
    .optional().trim(),
  body('priority')
    .optional()
    .isInt({ min: 0 }).withMessage('Priority must be a non-negative integer'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for banner ID
const bannerIdValidator = [
    param('bannerId')
      .isMongoId().withMessage('Invalid banner ID'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ApiError(400, 'Validation failed', errors.array()));
      }
      next();
    }
  ];

// Validator for getting banners
const getBannersValidator = [
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

module.exports = {
  bannerValidator,
  bannerIdValidator,
  getBannersValidator
};