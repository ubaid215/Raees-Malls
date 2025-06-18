const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');
const Product = require('../models/Product');

// Validator for adding to wishlist
const addToWishlistValidator = [
  body('deviceId')
    .isString().withMessage('Device ID must be a string')
    .notEmpty().withMessage('Device ID is required')
    .trim()
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    .withMessage('Device ID must be a valid UUID'),

  body('productId')
    .isMongoId().withMessage('Invalid product ID format')
    .custom(async (value) => {
      try {
        const product = await Product.findById(value);
        if (!product) {
          throw new Error('Product does not exist');
        }
        return true;
      } catch (error) {
        console.error('Product validation error:', error);
        if (error.message === 'Product does not exist') {
          throw error;
        }
        throw new Error('Error validating product');
      }
    }),

  body('variantId')
    .optional()
    .isMongoId().withMessage('Invalid variant ID format')
    .custom(async (value, { req }) => {
      if (value) {
        try {
          const product = await Product.findById(req.body.productId);
          if (!product) {
            throw new Error('Product does not exist for variant validation');
          }
          if (!product.variants || !Array.isArray(product.variants)) {
            throw new Error('Product has no variants');
          }
          const variantExists = product.variants.some(v => 
            v._id && v._id.toString() === value
          );
          if (!variantExists) {
            throw new Error('Variant does not exist for this product');
          }
        } catch (error) {
          console.error('Variant validation error:', error);
          if (error.message.includes('does not exist') || error.message === 'Product has no variants') {
            throw error;
          }
          throw new Error('Error validating variant');
        }
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }));
      console.error('Validation errors:', errorMessages); // Log for debugging
      return next(new ApiError(400, 'Validation failed', errorMessages));
    }
    next();
  }
];

// Validator for removing from wishlist
const removeFromWishlistValidator = [
  body('deviceId')
    .isString().withMessage('Device ID must be a string')
    .notEmpty().withMessage('Device ID is required')
    .trim(),
  
  param('productId')
    .isMongoId().withMessage('Invalid product ID format')
    .custom(async (value) => {
      try {
        const product = await Product.findById(value);
        if (!product) {
          throw new Error('Product does not exist');
        }
        return true;
      } catch (error) {
        if (error.message === 'Product does not exist') {
          throw error;
        }
        throw new Error('Error validating product');
      }
    }),
  
  param('variantId')
    .optional()
    .isMongoId().withMessage('Invalid variant ID format')
    .custom(async (value, { req }) => {
      if (value && value !== 'undefined') {
        try {
          const product = await Product.findById(req.params.productId);
          if (!product) {
            throw new Error('Product does not exist for variant validation');
          }
          
          const variantExists = product.variants && product.variants.some(v => 
            v._id && v._id.toString() === value
          );
          
          if (!variantExists) {
            throw new Error('Variant does not exist for this product');
          }
        } catch (error) {
          if (error.message.includes('does not exist')) {
            throw error;
          }
          throw new Error('Error validating variant');
        }
      }
      return true;
    }),
  
  // Error handler middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }));
      
      return next(new ApiError(400, 'Validation failed', errorMessages));
    }
    next();
  }
];

// Validator for getting wishlist
const getWishlistValidator = [
  query('deviceId')
    .isString().withMessage('Device ID must be a string')
    .notEmpty().withMessage('Device ID is required')
    .trim(),
  
  // Error handler middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }));
      
      return next(new ApiError(400, 'Validation failed', errorMessages));
    }
    next();
  }
];

module.exports = {
  addToWishlistValidator,
  removeFromWishlistValidator,
  getWishlistValidator
};