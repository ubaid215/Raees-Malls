const { body, param, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');
const Product = require('../models/Product');

// Validator for adding to wishlist
const addToWishlistValidator = [
  body('productId')
    .isMongoId().withMessage('Invalid product ID')
    .custom(async (value) => {
      const product = await Product.findById(value);
      if (!product) {
        throw new Error('Product does not exist');
      }
      return true;
    }),
  body('variantId')
    .optional()
    .isMongoId().withMessage('Invalid variant ID')
    .custom(async (value, { req }) => {
      if (value) {
        const product = await Product.findById(req.body.productId);
        if (!product || !product.variants.some(v => v._id.toString() === value)) {
          throw new Error('Variant does not exist for this product');
        }
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

// Validator for removing from wishlist
const removeFromWishlistValidator = [
  param('productId')
    .isMongoId().withMessage('Invalid product ID')
    .custom(async (value) => {
      const product = await Product.findById(value);
      if (!product) {
        throw new Error('Product does not exist');
      }
      return true;
    }),
  param('variantId')
    .optional()
    .isMongoId().withMessage('Invalid variant ID')
    .custom(async (value, { req }) => {
      if (value) {
        const product = await Product.findById(req.params.productId);
        if (!product || !product.variants.some(v => v._id.toString() === value)) {
          throw new Error('Variant does not exist for this product');
        }
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

module.exports = {
  addToWishlistValidator,
  removeFromWishlistValidator
};