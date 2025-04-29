const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose'); // Added missing mongoose import
const ApiError = require('../utils/apiError');
const Category = require('../models/Category');


const validateImage = (req, next) => {
  if (req.file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return next(new ApiError(400, 'Only JPEG, PNG, and WebP images are allowed'));
    }
    if (req.file.size > 5 * 1024 * 1024) { // 5MB limit
      return next(new ApiError(400, 'Image size must be less than 5MB'));
    }
  }
  return null;
};


const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation Errors:', errors.array()); // Log errors to console
    return next(new ApiError(400, 'Validation failed', errors.array()));
  }
  next();
};


const validateParentId = async (value) => {
  if (value === 'null') return true;
  const category = await Category.findById(value);
  if (!category) {
    throw new Error('Parent category does not exist');
  }
  return true;
};

// =====================================================
// VALIDATOR MIDDLEWARES
// =====================================================


// validation/categoryValidators.js
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
    .custom(validateParentId),
  checkValidationResult,
];


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
    .custom(validateParentId),
  
  (req, res, next) => {
    // Validate image if uploaded
    const imageError = validateImage(req, next);
    if (imageError) return imageError;

    // Check validation results
    checkValidationResult(req, res, next);
  }
];


const categoryIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid category ID'),
  
  checkValidationResult
];


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
  
  checkValidationResult
];


const getCategoriesForCustomersValidator = getCategoriesValidator;

module.exports = {
  createCategoryValidator,
  updateCategoryValidator,
  categoryIdValidator,
  getCategoriesValidator,
  getCategoriesForCustomersValidator
};