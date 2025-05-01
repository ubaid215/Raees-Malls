const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');
const mongoose = require('mongoose');

// Helper function to validate ObjectId or empty string
const isValidObjectIdOrEmpty = (value) => {
  return value === '' || mongoose.Types.ObjectId.isValid(value);
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log detailed error information for debugging
    console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request params:', JSON.stringify(req.params, null, 2));
    console.log('Request query:', JSON.stringify(req.query, null, 2));
    
    return next(new ApiError(400, 'Validation failed', errors.array()));
  }
  next();
};

const placeOrderValidator = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.variantId')
    .optional({ nullable: true, checkFalsy: false })
    .isMongoId()
    .withMessage('Invalid variant ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('shippingAddress')
    .exists()
    .withMessage('Shipping address is required')
    .isObject()
    .withMessage('Shipping address must be an object'),
  body('shippingAddress.fullName')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('shippingAddress.addressLine1')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('Address line 1 is required'),
  body('shippingAddress.addressLine2')
    .optional({ nullable: true })
    .trim(),
  body('shippingAddress.city')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('shippingAddress.state')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('shippingAddress.postalCode')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('Postal code is required'),
  body('shippingAddress.country')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  body('shippingAddress.phone')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+\d{1,4}\s\d{6,14}$/)
    .withMessage('Phone number must be in the format +[country code] [number], e.g., +92 3001234567'),
  body('discountCode')
    .optional({ nullable: true, checkFalsy: false })
    .isString().withMessage('Invalid discount code')
    .matches(/^[A-Z0-9-]+$/i).withMessage('Discount code can only contain letters, numbers, and hyphens'),
  validate
];

const updateOrderStatusValidator = [
  param('orderId')
    .isString()
    .matches(/^ORD-[A-F0-9]{8}$/i)
    .withMessage('Invalid order ID format. Must be like ORD-XXXXXXXX'),
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status value'),
  validate
];

const getOrdersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status value'),
  query('userId')
    .optional()
    .custom(isValidObjectIdOrEmpty)
    .withMessage('Invalid user ID'),
  validate
];

const downloadInvoiceValidator = [
  param('orderId')
    .isString()
    .matches(/^ORD-[A-F0-9]{8}$/i)
    .withMessage('Invalid order ID format. Must be like ORD-XXXXXXXX'),
  validate
];

module.exports = {
  placeOrderValidator,
  updateOrderStatusValidator,
  getOrdersValidator,
  downloadInvoiceValidator
};