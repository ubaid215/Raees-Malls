const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, 'Validation failed', errors.array()));
  }
  next();
};

// Validator for placing an order (POST /api/orders)
const placeOrderValidator = [
  // Validate items array
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.variantId')
    .optional()
    .isMongoId()
    .withMessage('Invalid variant ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  // Validate shippingAddress object
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
    .optional()
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
    .optional()
    .isString().withMessage('Invalid discount code')
    .matches(/^[A-Z0-9-]+$/i).withMessage('Discount code can only contain letters, numbers, and hyphens'),
  validate
];

// Validator for updating order status (PUT /api/admin/orders/:orderId)
const updateOrderStatusValidator = [
  param('orderId')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status value'),
  validate
];

// Validator for fetching orders (GET /api/orders and GET /api/admin/orders)
const getOrdersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status value'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  validate
];

// Validator for downloading invoice (GET /api/admin/orders/invoice/:orderId)
const downloadInvoiceValidator = [
  param('orderId')
    .isMongoId()
    .withMessage('Invalid order ID'),
  validate
];

module.exports = {
  placeOrderValidator,
  updateOrderStatusValidator,
  getOrdersValidator,
  downloadInvoiceValidator
};