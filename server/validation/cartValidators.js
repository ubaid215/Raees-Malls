const { body, param, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

// Validator for adding/updating cart items
const addToCartValidator = [
  body('productId')
    .isMongoId().withMessage('Invalid product ID'),
  body('variantId')
    .optional()
    .isMongoId().withMessage('Invalid variant ID'),
  body('quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for removing items from cart
const removeFromCartValidator = [
  param('productId')
    .isMongoId().withMessage('Invalid product ID'),
  param('variantId')
    .optional()
    .isMongoId().withMessage('Invalid variant ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for placing order from cart
const placeOrderFromCartValidator = [
  body('shippingAddress.fullName')
    .trim().notEmpty().withMessage('Full name is required'),
  body('shippingAddress.addressLine1')
    .trim().notEmpty().withMessage('Address line 1 is required'),
  body('shippingAddress.addressLine2')
    .optional().trim(),
  body('shippingAddress.city')
    .trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state')
    .trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.postalCode')
    .trim().notEmpty().withMessage('Postal code is required'),
  body('shippingAddress.country')
    .trim().notEmpty().withMessage('Country is required'),
  body('shippingAddress.phone')
    .trim().notEmpty().withMessage('Phone number is required')
    .matches(/^\+\d{1,4}\s\d{6,14}$/).withMessage('Phone number must be in the format +[country code] [number], e.g., +92 3001234567'),
  body('discountCode')
    .optional()
    .isString().withMessage('Invalid discount code')
    .matches(/^[A-Z0-9-]+$/i).withMessage('Discount code can only contain letters, numbers, and hyphens'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

module.exports = {
  addToCartValidator,
  removeFromCartValidator,
  placeOrderFromCartValidator
};