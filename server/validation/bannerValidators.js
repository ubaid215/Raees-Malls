const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation Errors:', errors.array());
    return next(new ApiError(400, 'Validation failed', errors.array()));
  }
  next();
};

const bannerValidator = [
  body('title')
    .optional() // Make title optional
    .trim(),
  body('description')
    .optional()
    .trim(),
  body('targetUrl')
    .optional()
    .trim(),
  body('priority')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Priority must be a non-negative integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('position')
    .trim()
    .notEmpty()
    .withMessage('Position is required')
    .isIn(['hero-slider',  'featured-products-banner'])
    .withMessage('Invalid position'),
  checkValidationResult
];

const bannerIdValidator = [
  param('bannerId')
    .isMongoId()
    .withMessage('Invalid banner ID'),
  checkValidationResult
];

const getBannersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  checkValidationResult
];

module.exports = {
  bannerValidator,
  bannerIdValidator,
  getBannersValidator,
  validate: checkValidationResult
};