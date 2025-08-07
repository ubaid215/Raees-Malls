const { body, param, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

// Helper function to validate storage capacity with more flexible formats
const validateStorageCapacity = (value) => {
  if (!value) return true;
  
  // Allow formats like:
  // - "4GB 64GB"
  // - "4GB+64GB"
  // - "4GB/64GB"
  // - "4GB RAM + 64GB Storage"
  // - "64GB"
  const pattern = /^([0-9]+\s*[A-Za-z]+\s*[\+\/]\s*[0-9]+\s*[A-Za-z]+|[0-9]+\s*[A-Za-z]+(\s*[\+\/]\s*[0-9]+\s*[A-Za-z]+)*)$/i;
  return pattern.test(value);
};

// Helper function to validate size with more flexible formats
const validateSize = (value) => {
  if (!value) return true;
  
  // Allow formats like:
  // - "S", "M", "L", "XL"
  // - "32", "42"
  // - "10.5", "11.5"
  // - "10-12", "XS-S"
  const pattern = /^[A-Za-z0-9\-\.\s]+$/i;
  return pattern.test(value);
};

// Validator for adding/updating cart items
const addToCartValidator = [
  body('productId')
    .isMongoId().withMessage('Invalid product ID'),
  
  body('variantColor')
    .optional()
    .isString().withMessage('Variant color must be a string')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Variant color must be between 1 and 50 characters'),
  
  body('storageCapacity')
    .optional()
    .isString().withMessage('Storage capacity must be a string')
    .trim()
    .custom(validateStorageCapacity).withMessage('Storage capacity must be in valid format (e.g., 64GB, 4GB+64GB, 4GB/64GB)'),
  
  body('size')
    .optional()
    .isString().withMessage('Size must be a string')
    .trim()
    .custom(validateSize).withMessage('Size must be in valid format (e.g., S, M, L, XL, 32, 42, 10.5)'),
  
  body('quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  
  // Custom validation to ensure variant configuration is valid
  body().custom((value, { req }) => {
    const { variantColor, storageCapacity, size } = req.body;
    
    // Log the values being validated
    console.log('🔍 Custom validation - Variant fields:', {
      variantColor,
      storageCapacity,
      size
    });
    
    // If any variant field is provided, variantColor is required
    if ((storageCapacity || size) && !variantColor) {
      console.error('❌ Validation Error: Variant color is required when specifying storage capacity or size');
      throw new Error('Variant color is required when specifying storage capacity or size');
    }
    
    // Cannot have both storage capacity and size
    if (storageCapacity && size) {
      console.error('❌ Validation Error: Cannot specify both storage capacity and size for the same item');
      throw new Error('Cannot specify both storage capacity and size for the same item');
    }
    
    console.log('✅ Custom validation passed');
    return true;
  }),
  
  // Error handling middleware
  (req, res, next) => {
    const errors = validationResult(req);
    
    // Log request details for debugging
    console.log('\n=== CART VALIDATION DEBUG INFO ===');
    console.log('📍 Endpoint:', req.method, req.originalUrl);
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    if (!errors.isEmpty()) {
      const errorArray = errors.array();
      
      console.log('❌ VALIDATION FAILED');
      console.log('🔢 Total Errors:', errorArray.length);
      
      // Log each validation error with details
      errorArray.forEach((error, index) => {
        console.log(`\n--- Error #${index + 1} ---`);
        console.log('Field:', error.path || error.param);
        console.log('Value:', JSON.stringify(error.value));
        console.log('Message:', error.msg);
        console.log('Location:', error.location);
      });
      
      // Create formatted error response
      const formattedErrors = errorArray.map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
        location: error.location
      }));
      
      console.log('\n📋 Formatted Errors for Response:');
      console.log(JSON.stringify(formattedErrors, null, 2));
      console.log('=================================\n');
      
      return next(new ApiError(400, 'Validation failed', formattedErrors));
    }
    
    console.log('✅ VALIDATION PASSED');
    console.log('=================================\n');
    next();
  }
];

// Update the other validators similarly
const updateCartItemValidator = [
  body('productId')
    .isMongoId().withMessage('Invalid product ID'),
  body('variantColor')
    .optional()
    .isString().withMessage('Variant color must be a string')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Variant color must be between 1 and 50 characters'),
  body('storageCapacity')
    .optional()
    .isString().withMessage('Storage capacity must be a string')
    .trim()
    .custom(validateStorageCapacity).withMessage('Storage capacity must be in valid format (e.g., 64GB, 4GB+64GB, 4GB/64GB)'),
  body('size')
    .optional()
    .isString().withMessage('Size must be a string')
    .trim()
    .custom(validateSize).withMessage('Size must be in valid format (e.g., S, M, L, XL, 32, 42, 10.5)'),
  body('quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  // Custom validation for variant configuration
  body().custom((value, { req }) => {
    const { variantColor, storageCapacity, size } = req.body;
    
    if ((storageCapacity || size) && !variantColor) {
      throw new Error('Variant color is required when specifying storage capacity or size');
    }
    
    if (storageCapacity && size) {
      throw new Error('Cannot specify both storage capacity and size for the same item');
    }
    
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

const removeFromCartValidator = [
  body('productId')
    .isMongoId().withMessage('Invalid product ID'),
  body('variantColor')
    .optional()
    .isString().withMessage('Variant color must be a string')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Variant color must be between 1 and 50 characters'),
  body('storageCapacity')
    .optional()
    .isString().withMessage('Storage capacity must be a string')
    .trim()
    .custom(validateStorageCapacity).withMessage('Storage capacity must be in valid format (e.g., 64GB, 4GB+64GB, 4GB/64GB)'),
  body('size')
    .optional()
    .isString().withMessage('Size must be a string')
    .trim()
    .custom(validateSize).withMessage('Size must be in valid format (e.g., S, M, L, XL, 32, 42, 10.5)'),
  // Custom validation for variant configuration
  body().custom((value, { req }) => {
    const { variantColor, storageCapacity, size } = req.body;
    
    if ((storageCapacity || size) && !variantColor) {
      throw new Error('Variant color is required when specifying storage capacity or size');
    }
    
    if (storageCapacity && size) {
      throw new Error('Cannot specify both storage capacity and size for the same item');
    }
    
    return true;
  }),
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
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF]+$/)
    .withMessage('Full name can only contain letters and spaces'),
  body('shippingAddress.addressLine1')
    .trim()
    .notEmpty().withMessage('Address line 1 is required')
    .isLength({ min: 5, max: 200 }).withMessage('Address line 1 must be between 5 and 200 characters'),
  body('shippingAddress.addressLine2')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Address line 2 cannot exceed 200 characters'),
  body('shippingAddress.city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF]+$/)
    .withMessage('City can only contain letters and spaces'),
  body('shippingAddress.state')
    .trim()
    .notEmpty().withMessage('State/Province is required')
    .isLength({ min: 2, max: 50 }).withMessage('State/Province must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF]+$/)
    .withMessage('State/Province can only contain letters and spaces'),
  body('shippingAddress.postalCode')
    .trim()
    .notEmpty().withMessage('Postal code is required')
    .matches(/^[0-9]{5}$/).withMessage('Postal code must be a 5-digit number (Pakistani format)'),
  body('shippingAddress.country')
    .trim()
    .notEmpty().withMessage('Country is required')
    .isIn(['Pakistan', 'PK', 'pakistan', 'pk']).withMessage('Currently only shipping to Pakistan is supported'),
  body('shippingAddress.phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^(\+92|0)(3[0-9]{2}|4[0-9]{2}|5[0-9]{2}|6[0-9]{2}|7[0-9]{2}|8[0-9]{2}|9[0-9]{2})[0-9]{7}$/)
    .withMessage('Phone number must be a valid Pakistani mobile number (e.g., +92 300 1234567, 03001234567, or 3001234567)'),
  body('discountCode')
    .optional()
    .isString().withMessage('Invalid discount code')
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Discount code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9-]+$/i).withMessage('Discount code can only contain letters, numbers, and hyphens'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for getting cart (no validation needed, but included for consistency)
const getCartValidator = [
  (req, res, next) => {
    // No validation needed for GET request
    next();
  }
];

// Validator for clearing cart (no validation needed, but included for consistency)
const clearCartValidator = [
  (req, res, next) => {
    // No validation needed for clearing cart
    next();
  }
];

module.exports = {
  addToCartValidator,
  updateCartItemValidator,
  removeFromCartValidator,
  placeOrderFromCartValidator,
  getCartValidator,
  clearCartValidator
};