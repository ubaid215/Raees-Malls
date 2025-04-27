const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');
const Product = require('../models/Product');
const Category = require('../models/Category');

// Validator for creating/updating discounts
const createDiscountValidator = [
  body('code')
    .isString().withMessage('Discount code must be a string')
    .matches(/^[A-Z0-9-]+$/i).withMessage('Discount code can only contain letters, numbers, and hyphens')
    .isLength({ min: 5, max: 20 }).withMessage('Discount code must be between 5 and 20 characters')
    .trim(),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string')
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
    .trim(),
  body('type')
    .isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('value')
    .isFloat({ min: 0 }).withMessage('Discount value must be a positive number'),
  body('applicableTo')
    .isIn(['all', 'products', 'categories', 'orders']).withMessage('Invalid applicable scope'),
  body('productIds')
    .optional()
    .isArray().withMessage('Product IDs must be an array')
    .custom(async (value, { req }) => {
      if (req.body.applicableTo === 'products' && value.length === 0) {
        throw new Error('Product IDs are required when applicableTo is "products"');
      }
      if (value.length > 0) {
        const products = await Product.find({ _id: { $in: value } });
        if (products.length !== value.length) {
          throw new Error('One or more product IDs are invalid');
        }
      }
      return true;
    }),
  body('categoryIds')
    .optional()
    .isArray().withMessage('Category IDs must be an array')
    .custom(async (value, { req }) => {
      if (req.body.applicableTo === 'categories' && value.length === 0) {
        throw new Error('Category IDs are required when applicableTo is "categories"');
      }
      if (value.length > 0) {
        const categories = await Category.find({ _id: { $in: value } });
        if (categories.length !== value.length) {
          throw new Error('One or more category IDs are invalid');
        }
      }
      return true;
    }),
  body('minOrderAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum order amount must be a positive number'),
  body('startDate')
    .isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate')
    .isISO8601().withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('usageLimit')
    .optional()
    .isInt({ min: 0 }).withMessage('Usage limit must be a non-negative integer'),
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

// Validator for discount ID
const discountIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid discount ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for getting discounts
const getDiscountsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('isActive')
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

// Validator for applying discounts
const applyDiscountValidator = [
  body('code')
    .isString().withMessage('Discount code must be a string')
    .matches(/^[A-Z0-9-]+$/i).withMessage('Discount code can only contain letters, numbers, and hyphens')
    .isLength({ min: 5, max: 20 }).withMessage('Discount code must be between 5 and 20 characters')
    .trim(),
  body('orderTotal')
    .isFloat({ min: 0 }).withMessage('Order total must be a positive number'),
  body('productIds')
    .isArray().withMessage('Product IDs must be an array')
    .custom(async (value) => {
      if (value.length > 0) {
        const products = await Product.find({ _id: { $in: value } });
        if (products.length !== value.length) {
          throw new Error('One or more product IDs are invalid');
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
  createDiscountValidator,
  discountIdValidator,
  getDiscountsValidator,
  applyDiscountValidator
};