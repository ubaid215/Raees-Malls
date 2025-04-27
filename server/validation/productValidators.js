const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');
const Category = require('../models/Category');
const Product = require('../models/Product');

// Helper function to parse specifications or variants if string
const parseJsonField = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error('Field must be a valid JSON');
    }
  }
  return value;
};

// Validator for creating a product
const createProductValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('price')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discountPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount price must be a positive number')
    .custom((value, { req }) => {
      if (value && value >= req.body.price) {
        throw new Error('Discount price must be less than the price');
      }
      return true;
    }),
  body('categoryId')
    .isMongoId().withMessage('Invalid category ID')
    .custom(async (value) => {
      const category = await Category.findById(value);
      if (!category) {
        throw new Error('Category does not exist');
      }
      return true;
    }),
  body('brand')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Brand must be between 2 and 50 characters'),
  body('stock')
    .isInt({ min: 0 }).withMessage('Stock must be a positive integer'),
  body('sku')
    .trim()
    .notEmpty().withMessage('SKU is required')
    .isLength({ min: 5, max: 20 }).withMessage('SKU must be between 5 and 20 characters')
    .matches(/^[A-Z0-9-]+$/i).withMessage('SKU can only contain uppercase letters, numbers, and hyphens')
    .custom(async (value) => {
      const product = await Product.findOne({ sku: value });
      if (product) {
        throw new Error('SKU must be unique');
      }
      return true;
    }),
  body('variants')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray().withMessage('Variants must be an array')
    .custom((value) => {
      return value.every(variant => 
        variant.sku && 
        typeof variant.sku === 'string' && 
        /^[A-Z0-9-]+$/i.test(variant.sku) &&
        variant.price && 
        typeof variant.price === 'number' && 
        variant.price >= 0 &&
        variant.stock && 
        typeof variant.stock === 'number' && 
        variant.stock >= 0 &&
        Array.isArray(variant.attributes) &&
        variant.attributes.every(attr => 
          attr.key && 
          typeof attr.key === 'string' && 
          attr.value && 
          typeof attr.value === 'string'
        )
      );
    }).withMessage('Each variant must have a valid SKU, price, stock, and attributes array'),
  body('specifications')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray().withMessage('Specifications must be an array')
    .custom((value) => {
      return value.every(spec => spec.key && spec.value && typeof spec.key === 'string' && typeof spec.value === 'string');
    }).withMessage('Each specification must have a key and value as strings'),
  body('seo.slug')
    .optional()
    .trim()
    .isLowercase().withMessage('SEO slug must be lowercase')
    .matches(/^[a-z0-9-]+$/).withMessage('SEO slug can only contain lowercase letters, numbers, and hyphens'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for updating a product
const updateProductValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discountPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount price must be a positive number')
    .custom((value, { req }) => {
      const price = req.body.price || req.product?.price;
      if (value && price && value >= price) {
        throw new Error('Discount price must be less than the price');
      }
      return true;
    }),
  body('categoryId')
    .optional()
    .isMongoId().withMessage('Invalid category ID')
    .custom(async (value) => {
      const category = await Category.findById(value);
      if (!category) {
        throw new Error('Category does not exist');
      }
      return true;
    }),
  body('brand')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Brand must be between 2 and 50 characters'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a positive integer'),
  body('sku')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 }).withMessage('SKU must be between 5 and 20 characters')
    .matches(/^[A-Z0-9-]+$/i).withMessage('SKU can only contain uppercase letters, numbers, and hyphens')
    .custom(async (value, { req }) => {
      const product = await Product.findOne({ sku: value, _id: { $ne: req.params.id } });
      if (product) {
        throw new Error('SKU must be unique');
      }
      return true;
    }),
  body('variants')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray().withMessage('Variants must be an array')
    .custom((value) => {
      return value.every(variant => 
        variant.sku && 
        typeof variant.sku === 'string' && 
        /^[A-Z0-9-]+$/i.test(variant.sku) &&
        variant.price && 
        typeof variant.price === 'number' && 
        variant.price >= 0 &&
        variant.stock && 
        typeof variant.stock === 'number' && 
        variant.stock >= 0 &&
        Array.isArray(variant.attributes) &&
        variant.attributes.every(attr => 
          attr.key && 
          typeof attr.key === 'string' && 
          attr.value && 
          typeof attr.value === 'string'
        )
      );
    }).withMessage('Each variant must have a valid SKU, price, stock, and attributes array'),
  body('specifications')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray().withMessage('Specifications must be an array')
    .custom((value) => {
      return value.every(spec => spec.key && spec.value && typeof spec.key === 'string' && typeof spec.value === 'string');
    }).withMessage('Each specification must have a key and value as strings'),
  body('seo.slug')
    .optional()
    .trim()
    .isLowercase().withMessage('SEO slug must be lowercase')
    .matches(/^[a-z0-9-]+$/).withMessage('SEO slug can only contain lowercase letters, numbers, and hyphens'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for product ID in params
const productIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid product ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for query parameters in getAllProducts (Admin)
const getProductsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['price', '-price', 'createdAt', '-createdAt', 'averageRating', '-averageRating'])
    .withMessage('Invalid sort value'),
  query('categoryId')
    .optional()
    .isMongoId().withMessage('Invalid category ID'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum price must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum price must be a positive number'),
  query('attributeKey')
    .optional()
    .isIn(['size', 'color', 'material', 'style']).withMessage('Invalid attribute key'),
  query('attributeValue')
    .optional()
    .isString().withMessage('Attribute value must be a string'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Validator for query parameters in getAllProductsForCustomers (Public)
const getProductsForCustomersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['price', '-price', 'createdAt', '-createdAt', 'averageRating', '-averageRating'])
    .withMessage('Invalid sort value'),
  query('categoryId')
    .optional()
    .isMongoId().withMessage('Invalid category ID'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum price must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum price must be a positive number'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search term cannot exceed 100 characters'),
  query('attributeKey')
    .optional()
    .isIn(['size', 'color', 'material', 'style']).withMessage('Invalid attribute key'),
  query('attributeValue')
    .optional()
    .isString().withMessage('Attribute value must be a string'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

module.exports = {
  createProductValidator,
  updateProductValidator,
  productIdValidator,
  getProductsValidator,
  getProductsForCustomersValidator
};