const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');
const Category = require('../models/Category');

// Validator for creating a category
const createCategoryValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('slug')
    .trim()
    .notEmpty().withMessage('Slug is required')
    .isLowercase().withMessage('Slug must be lowercase')
    .matches(/^[a-z0-9-]+$/).withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('parentId')
    .optional()
    .custom((value) => {
      if (value === 'null') return true;
      return mongoose.Types.ObjectId.isValid(value);
    }).withMessage('Invalid parent category ID')
    .custom(async (value) => {
      if (value === 'null') return true;
      const category = await Category.findById(value);
      if (!category) {
        throw new Error('Parent category does not exist');
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

// Validator for updating a category
const updateCategoryValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('slug')
    .optional()
    .trim()
    .isLowercase().withMessage('Slug must be lowercase')
    .matches(/^[a-z0-9-]+$/).withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('parentId')
    .optional()
    .custom((value) => {
      if (value === 'null') return true;
      return mongoose.Types.ObjectId.isValid(value);
    }).withMessage('Invalid parent category ID')
    .custom(async (value) => {
      if (value === 'null') return true;
      const category = await Category.findById(value);
      if (!category) {
        throw new Error('Parent category does not exist');
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

// Validator for category ID in params
const categoryIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid category ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for query parameters in getAllCategories (Admin)
const getCategoriesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['name', '-name', 'createdAt', '-createdAt']).withMessage('Invalid sort value'),
  query('parentId')
    .optional()
    .custom((value) => {
      if (value === 'null') return true;
      return mongoose.Types.ObjectId.isValid(value);
    }).withMessage('Invalid parent category ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for query parameters in getAllCategoriesForCustomers (Public)
const getCategoriesForCustomersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['name', '-name', 'createdAt', '-createdAt']).withMessage('Invalid sort value'),
  query('parentId')
    .optional()
    .custom((value) => {
      if (value === 'null') return true;
      return mongoose.Types.ObjectId.isValid(value);
    }).withMessage('Invalid parent category ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

module.exports = {
  createCategoryValidator,
  updateCategoryValidator,
  categoryIdValidator,
  getCategoriesValidator,
  getCategoriesForCustomersValidator
};