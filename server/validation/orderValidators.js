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
    console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request params:', JSON.stringify(req.params, null, 2));
    console.log('Request query:', JSON.stringify(req.query, null, 2));

    return next(new ApiError(400, 'Validation failed', errors.array()));
  }
  next();
};

const placeOrderValidator = [
  // Items array validation
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),

  // Validate each item
  body('items').custom((items) => {
    items.forEach((item, i) => {
      if (!item.productId) {
        throw new Error(`items[${i}]: productId is required`);
      }
      if (!/^[0-9a-fA-F]{24}$/.test(item.productId)) {
        throw new Error(`items[${i}]: Invalid productId`);
      }
      if (!item.quantity || item.quantity < 1) {
        throw new Error(`items[${i}]: quantity must be at least 1`);
      }
      if (!item.price || item.price < 0) {
        throw new Error(`items[${i}]: price must be valid`);
      }

      // Variant validation - UPDATED to handle both old and new formats
      if (item.variantType) {
        if (!['simple', 'color', 'storage', 'size'].includes(item.variantType)) {
          throw new Error(`items[${i}]: Invalid variantType`);
        }

        switch (item.variantType) {
          case 'simple':
            if (!item.simpleProduct) {
              throw new Error(`items[${i}]: simple product details are required`);
            }
            break;

          case 'color':
            if (!item.colorVariant || !item.colorVariant.color || !item.colorVariant.color.name) {
              throw new Error(`items[${i}]: color variant details are required`);
            }
            if (!item.colorVariant.sku) {
              throw new Error(`items[${i}]: SKU is required for color variant`);
            }
            break;

          case 'storage':
            // Support both old format (storageVariant.capacity) and new format (storageVariant.storageOption.capacity)
            const hasOldFormat = item.storageVariant && item.storageVariant.capacity;
            const hasNewFormat = item.storageVariant && item.storageVariant.storageOption && item.storageVariant.storageOption.capacity;

            if (!hasOldFormat && !hasNewFormat) {
              throw new Error(`items[${i}]: storage variant details are required`);
            }

            // Check SKU in both formats
            const hasSkuOld = hasOldFormat && item.storageVariant.sku;
            const hasSkuNew = hasNewFormat && item.storageVariant.storageOption.sku;

            if (!hasSkuOld && !hasSkuNew) {
              throw new Error(`items[${i}]: SKU is required for storage variant`);
            }
            break;

          case 'size':
            // Support both old format (sizeVariant.size, sizeVariant.sku)
            // and new format (sizeVariant.sizeOption.size, sizeVariant.sizeOption.sku)
            const hasOldSize = item.sizeVariant && item.sizeVariant.size;
            const hasNewSize = item.sizeVariant && item.sizeVariant.sizeOption && item.sizeVariant.sizeOption.size;

            if (!hasOldSize && !hasNewSize) {
              throw new Error(`items[${i}]: size variant details are required`);
            }

            const hasOldSku = item.sizeVariant && item.sizeVariant.sku;
            const hasNewSku = item.sizeVariant && item.sizeVariant.sizeOption && item.sizeVariant.sizeOption.sku;

            if (!hasOldSku && !hasNewSku) {
              throw new Error(`items[${i}]: SKU is required for size variant`);
            }

            // Validate color if present
            if (item.sizeVariant.color) {
              if (!item.sizeVariant.color.name) {
                throw new Error(`items[${i}]: color name is required for size variant`);
              }
            }
            break;

        }
      } else {
        // If no variantType specified, assume it's a simple product
        if (!item.simpleProduct) {
          throw new Error(`items[${i}]: product details are required`);
        }
      }
    });
    return true;
  }),

  // Shipping address validation
  body('shippingAddress')
    .exists().withMessage('Shipping address is required')
    .isObject().withMessage('Shipping address must be an object'),

  body('shippingAddress.fullName')
    .trim().notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Full name cannot exceed 100 characters'),

  body('shippingAddress.addressLine1')
    .trim().notEmpty().withMessage('Address line 1 is required')
    .isLength({ max: 200 }).withMessage('Address line 1 cannot exceed 200 characters'),

  body('shippingAddress.addressLine2')
    .optional({ nullable: true }).trim()
    .isLength({ max: 200 }).withMessage('Address line 2 cannot exceed 200 characters'),

  body('shippingAddress.city')
    .trim().notEmpty().withMessage('City is required')
    .isLength({ max: 50 }).withMessage('City cannot exceed 50 characters'),

  body('shippingAddress.state')
    .trim().notEmpty().withMessage('State is required')
    .isLength({ max: 50 }).withMessage('State cannot exceed 50 characters'),

  body('shippingAddress.postalCode')
    .trim().notEmpty().withMessage('Postal code is required')
    .isLength({ max: 20 }).withMessage('Postal code cannot exceed 20 characters'),

  body('shippingAddress.country')
    .trim().notEmpty().withMessage('Country is required')
    .isLength({ max: 50 }).withMessage('Country cannot exceed 50 characters'),

  body('shippingAddress.phone')
    .trim().notEmpty().withMessage('Phone number is required')
    .matches(/^\+?\d{1,4}[\s-]?\d{6,14}$/).withMessage('Invalid phone number format'),

  // Add email validation for shipping address
  body('shippingAddress.email')
    .optional({ nullable: true })
    .isEmail().withMessage('Invalid email address'),

  // Payment and billing validation - UPDATED with all Bank Alfalah payment methods
  body('paymentMethod')
    .optional()
    .isIn([
      'cash_on_delivery', 
      'credit_card', 
      'debit_card',
      'alfa_wallet', 
      'alfalah_bank'
    ])
    .withMessage('Invalid payment method'),

  // Bank account validation for Alfalah Bank payments
  body('bankAccountNumber')
    .optional()
    .custom((value, { req }) => {
      if (req.body.paymentMethod === 'alfalah_bank' && !value) {
        throw new Error('Bank account number is required for Alfalah Bank payments');
      }
      if (value && !/^\d{10,16}$/.test(value)) {
        throw new Error('Bank account number must be 10-16 digits');
      }
      return true;
    }),

  // Billing address validation
  body('billingAddress')
    .optional().isObject().withMessage('Billing address must be an object'),

  body('billingAddress.sameAsShipping')
    .optional().isBoolean().withMessage('sameAsShipping must be a boolean'),

  body('billingAddress.fullName')
    .optional().trim().isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters'),

  body('billingAddress.addressLine1')
    .optional().trim().isLength({ max: 200 })
    .withMessage('Address line 1 cannot exceed 200 characters'),

  body('billingAddress.addressLine2')
    .optional().trim().isLength({ max: 200 })
    .withMessage('Address line 2 cannot exceed 200 characters'),

  body('billingAddress.city')
    .optional().trim().isLength({ max: 50 })
    .withMessage('City cannot exceed 50 characters'),

  body('billingAddress.state')
    .optional().trim().isLength({ max: 50 })
    .withMessage('State cannot exceed 50 characters'),

  body('billingAddress.postalCode')
    .optional().trim().isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters'),

  body('billingAddress.country')
    .optional().trim().isLength({ max: 50 })
    .withMessage('Country cannot exceed 50 characters'),

  // Order totals validation
  body('totalShippingCost')
    .optional().isFloat({ min: 0 }).withMessage('Invalid shipping cost'),

  body('subtotal')
    .optional().isFloat({ min: 0 }).withMessage('Invalid subtotal'),

  body('total')
    .optional().isFloat({ min: 0 }).withMessage('Invalid total'),

  // Discount validation
  body('discountCode')
    .optional({ nullable: true }).isString().withMessage('Invalid discount code')
    .matches(/^[A-Z0-9-]+$/i).withMessage('Discount code can only contain letters, numbers, and hyphens')
    .isLength({ max: 20 }).withMessage('Discount code cannot exceed 20 characters'),

  // Save address validation
  body('saveAddress')
    .optional().isBoolean().withMessage('saveAddress must be a boolean'),

  // Use existing address validation
  body('useExistingAddress')
    .optional().isBoolean().withMessage('useExistingAddress must be a boolean'),

  body('existingAddressId')
    .optional()
    .custom((value, { req }) => {
      if (req.body.useExistingAddress && !value) {
        throw new Error('existingAddressId is required when useExistingAddress is true');
      }
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid existingAddressId format');
      }
      return true;
    }),

  // Order notes validation
  body('orderNotes')
    .optional().isString().withMessage('Order notes must be a string')
    .isLength({ max: 500 }).withMessage('Order notes cannot exceed 500 characters'),

  validate
];

const updateOrderStatusValidator = [
  param('orderId')
    .isString()
    .matches(/^ORD-[A-F0-9]{8}$/i)
    .withMessage('Invalid order ID format. Must be like ORD-XXXXXXXX'),
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid status value'),
  body('trackingInfo.carrier')
    .optional()
    .isString()
    .withMessage('Carrier must be a string'),
  body('trackingInfo.trackingNumber')
    .optional()
    .isString()
    .withMessage('Tracking number must be a string'),
  body('trackingInfo.trackingUrl')
    .optional()
    .isURL()
    .withMessage('Tracking URL must be a valid URL'),
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
    .isIn(['', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid status value'),
  query('userId')
    .optional()
    .custom(isValidObjectIdOrEmpty)
    .withMessage('Invalid user ID'),
  query('paymentMethod')
    .optional()
    .isIn(['', 'cash_on_delivery', 'credit_card', 'debit_card', 'alfa_wallet', 'alfalah_bank'])
    .withMessage('Invalid payment method'),
  query('paymentStatus')
    .optional()
    .isIn(['', 'pending', 'completed', 'failed', 'refunded', 'not_required'])
    .withMessage('Invalid payment status'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateFrom'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateTo'),
  validate
];

const downloadInvoiceValidator = [
  param('orderId')
    .isString()
    .matches(/^ORD-[A-F0-9]{8}$/i)
    .withMessage('Invalid order ID format. Must be like ORD-XXXXXXXX'),
  validate
];

const cancelOrderValidator = [
  param('orderId')
    .isString()
    .matches(/^ORD-[A-F0-9]{8}$/i)
    .withMessage('Invalid order ID format. Must be like ORD-XXXXXXXX'),
  validate
];

// NEW: Check payment status validator
const checkPaymentStatusValidator = [
  param('orderId')
    .isString()
    .matches(/^ORD-[A-F0-9]{8}$/i)
    .withMessage('Invalid order ID format. Must be like ORD-XXXXXXXX'),
  validate
];

// NEW: Retry payment validator
const retryPaymentValidator = [
  param('orderId')
    .isString()
    .matches(/^ORD-[A-F0-9]{8}$/i)
    .withMessage('Invalid order ID format. Must be like ORD-XXXXXXXX'),
  validate
];

// NEW: IPN handler validator (for Bank Alfalah Payment Gateway)
const ipnHandlerValidator = [
  body('handshake_key')
    .notEmpty()
    .withMessage('Handshake key is required'),
  body('transaction_id')
    .notEmpty()
    .withMessage('Transaction ID is required'),
  body('transaction_status')
    .notEmpty()
    .withMessage('Transaction status is required'),
  body('transaction_amount')
    .notEmpty()
    .isFloat({ min: 0 })
    .withMessage('Valid transaction amount is required'),
  body('transaction_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid transaction date format'),
  body('response_code')
    .optional()
    .isString()
    .withMessage('Response code must be a string'),
  body('response_message')
    .optional()
    .isString()
    .withMessage('Response message must be a string'),
  body('basket_id')
    .optional()
    .isString()
    .withMessage('Basket ID must be a string'),
  // Additional Bank Alfalah specific fields
  body('merchant_id')
    .optional()
    .isString()
    .withMessage('Merchant ID must be a string'),
  body('store_id')
    .optional()
    .isString()
    .withMessage('Store ID must be a string'),
  body('channel_id')
    .optional()
    .isString()
    .withMessage('Channel ID must be a string'),
  body('currency')
    .optional()
    .isString()
    .withMessage('Currency must be a string'),
  validate
];

// NEW: Payment return validator
const paymentReturnValidator = [
  query('transaction_id')
    .optional()
    .isString()
    .withMessage('Transaction ID must be a string'),
  query('response_code')
    .optional()
    .isString()
    .withMessage('Response code must be a string'),
  query('response_message')
    .optional()
    .isString()
    .withMessage('Response message must be a string'),
  query('basket_id')
    .optional()
    .isString()
    .withMessage('Basket ID must be a string'),
  // Additional Bank Alfalah return parameters
  query('auth_token')
    .optional()
    .isString()
    .withMessage('Auth token must be a string'),
  query('session_id')
    .optional()
    .isString()
    .withMessage('Session ID must be a string'),
  query('merchant_id')
    .optional()
    .isString()
    .withMessage('Merchant ID must be a string'),
  query('store_id')
    .optional()
    .isString()
    .withMessage('Store ID must be a string'),
  validate
];

// NEW: Handshake validator for Bank Alfalah
const handshakeValidator = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isString()
    .withMessage('Order ID must be a string'),
  body('transactionAmount')
    .notEmpty()
    .isFloat({ min: 1 })
    .withMessage('Valid transaction amount is required'),
  validate
];

// NEW: Payment form generation validator
const paymentFormValidator = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isString()
    .withMessage('Order ID must be a string'),
  body('paymentMethod')
    .notEmpty()
    .isIn(['credit_card', 'debit_card', 'alfa_wallet', 'alfalah_bank'])
    .withMessage('Invalid payment method'),
  body('transactionAmount')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Valid transaction amount is required'),
  body('bankAccountNumber')
    .optional()
    .custom((value, { req }) => {
      if (req.body.paymentMethod === 'alfalah_bank' && !value) {
        throw new Error('Bank account number is required for Alfalah Bank payments');
      }
      if (value && !/^\d{10,16}$/.test(value)) {
        throw new Error('Bank account number must be 10-16 digits');
      }
      return true;
    }),
  validate
];

// NEW: Revenue stats validator
const revenueStatsValidator = [
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('Period must be one of: day, week, month, year'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate
];

// NEW: Product revenue validator
const productRevenueValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  validate
];

// NEW: Recent notifications validator
const recentNotificationsValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20'),
  validate
];

module.exports = {
  placeOrderValidator,
  updateOrderStatusValidator,
  getOrdersValidator,
  downloadInvoiceValidator,
  cancelOrderValidator,
  checkPaymentStatusValidator,
  retryPaymentValidator,
  ipnHandlerValidator,
  paymentReturnValidator,
  handshakeValidator,
  paymentFormValidator,
  revenueStatsValidator,
  productRevenueValidator,
  recentNotificationsValidator,
  validate
};