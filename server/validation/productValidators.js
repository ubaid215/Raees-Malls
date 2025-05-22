const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');
const Category = require('../models/Category');
const Product = require('../models/Product');

console.log('Initializing product validators...');

const parseJsonField = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error('Field must be a valid JSON');
    }
  }
  return value;
};

const createProductValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Product title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Product title must be between 3 and 100 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Product description is required')
    .isLength({ min: 10, max: 3000 })
    .withMessage('Product description must be between 10 and 3000 characters'),

  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
    .toFloat(),

  body('discountPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a positive number')
    .toFloat()
    .custom((value, { req }) => {
      if (value >= req.body.price) {
        throw new Error('Base product discount price must be less than the price');
      }
      return true;
    }),

  body('shippingCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Shipping cost must be a non-negative number')
    .toFloat(),

  body('categoryId')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('brand')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand must not exceed 50 characters'),

  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a positive integer')
    .toInt(),

  body('sku')
    .optional()
    .trim()
    .matches(/^[A-Z0-9-]*$/)
    .withMessage('SKU can only contain letters, numbers, and hyphens')
    .isLength({ max: 20 })
    .withMessage('SKU must not exceed 20 characters'),

  body('seo.title')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('SEO title must not exceed 60 characters'),

  body('seo.description')
    .optional()
    .trim()
    .isLength({ max: 3000 })
    .withMessage('SEO description must not exceed 3000 characters'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),

  body('specifications')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray()
    .withMessage('Specifications must be an array')
    .custom(specs => {
      if (!specs.every(spec => spec.key && spec.value)) {
        throw new Error('Each specification must have a key and value');
      }
      return true;
    }),

  body('features')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray()
    .withMessage('Features must be an array')
    .custom(features => {
      if (!features.every(f => typeof f === 'string' && f.trim().length >= 1 && f.trim().length <= 200)) {
        throw new Error('Each feature must be a string between 1 and 200 characters');
      }
      return true;
    }),

  body('variants')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray()
    .withMessage('Variants must be an array')
    .custom(variants => {
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        if (!variant.price || typeof variant.price !== 'number' || variant.price < 0) {
          throw new Error(`Variant ${i + 1}: Price must be a positive number`);
        }
        if (variant.discountPrice) {
          if (typeof variant.discountPrice !== 'number' || variant.discountPrice < 0) {
            throw new Error(`Variant ${i + 1}: Discount price must be a positive number`);
          }
          if (variant.discountPrice >= variant.price) {
            throw new Error(`Variant ${i + 1}: Discount price must be less than the price`);
          }
        }
        if (!Number.isInteger(variant.stock) || variant.stock < 0) {
          throw new Error(`Variant ${i + 1}: Stock must be a positive integer`);
        }
        if (!variant.attributes || !Array.isArray(variant.attributes) || variant.attributes.length === 0) {
          throw new Error(`Variant ${i + 1}: At least one attribute is required`);
        }
        if (!variant.attributes.every(attr => attr.key && attr.value)) {
          throw new Error(`Variant ${i + 1}: Each attribute must have a key and value`);
        }
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  },
];

const updateProductValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 3000 })
    .withMessage('Description must be between 10 and 3000 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('discountPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a positive number')
    .custom((value, { req }) => {
      const price = req.body.price || req.product?.price;
      if (value && price && value >= price) {
        throw new Error('Discount price must be less than the price');
      }
      return true;
    }),

  body('shippingCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Shipping cost must be a non-negative number')
    .toFloat(),

  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID')
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
    .isLength({ min: 2, max: 50 })
    .withMessage('Brand must be between 2 and 50 characters'),

  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a positive integer'),

  body('sku')
    .optional()
    .trim()
    .custom(async (value, { req }) => {
      if (value) {
        if (!/^[A-Z0-9-]+$/i.test(value)) {
          throw new Error('SKU can only contain letters, numbers, and hyphens');
        }
        const product = await Product.findOne({ sku: value, _id: { $ne: req.params.id } });
        if (product) {
          throw new Error('SKU must be unique');
        }
      }
      return true;
    }),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),

  body('variants')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray()
    .withMessage('Variants must be an array')
    .custom((variants, { req }) => {
      if (!variants) return true;
      return variants.every((variant, index) => {
        if (variant.sku && !/^[A-Z0-9-]+$/i.test(variant.sku)) {
          throw new Error(`Variant ${index + 1}: SKU can only contain letters, numbers, and hyphens`);
        }
        if (typeof variant.price !== 'number' || variant.price < 0) {
          throw new Error(`Variant ${index + 1}: Price must be a positive number`);
        }
        if (variant.discountPrice !== undefined) {
          if (typeof variant.discountPrice !== 'number' || variant.discountPrice < 0) {
            throw new Error(`Variant ${index + 1}: Discount price must be a positive number`);
          }
          if (variant.discountPrice >= variant.price) {
            throw new Error(`Variant ${index + 1}: Discount price must be less than the price`);
          }
        }
        if (!Number.isInteger(variant.stock) || variant.stock < 0) {
          throw new Error(`Variant ${index + 1}: Stock must be a positive integer`);
        }
        if (!Array.isArray(variant.attributes) || variant.attributes.length === 0) {
          throw new Error(`Variant ${index + 1}: At least one attribute is required`);
        }
        return variant.attributes.every((attr, attrIndex) => {
          if (!attr.key || !attr.value) {
            throw new Error(`Variant ${index + 1}, Attribute ${attrIndex + 1}: Both key and value are required`);
          }
          return true;
        });
      });
    }),

  body('specifications')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray()
    .withMessage('Specifications must be an array')
    .custom((value) => {
      const isValid = value.every(spec => typeof spec.key === 'string' && typeof spec.value === 'string');
      if (!isValid) {
        throw new Error('Each specification must have a key and value as strings');
      }
      return true;
    }),

  body('features')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray()
    .withMessage('Features must be an array')
    .custom(features => {
      if (!features.every(f => typeof f === 'string' && f.trim().length >= 1 && f.trim().length <= 200)) {
        throw new Error('Each feature must be a string between 1 and 200 characters');
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  },
];

const productIdValidator = [
  param('id').isMongoId().withMessage('Invalid product ID'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  },
];

const commonQueryValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sort')
    .optional()
    .isIn(['price', '-price', 'createdAt', '-createdAt', 'averageRating', '-averageRating'])
    .withMessage('Invalid sort value'),

  query('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),

  query('attributeKey')
    .optional()
    .isString()
    .withMessage('Attribute key must be a string'),

  query('attributeValue')
    .optional()
    .isString()
    .withMessage('Attribute value must be a string'),

  query('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
];

const getProductsValidator = [
  ...commonQueryValidators,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  },
];

const getProductsForCustomersValidator = [
  ...commonQueryValidators,
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  },
];

console.log('Product validators initialized successfully');

module.exports = {
  createProductValidator,
  updateProductValidator,
  productIdValidator,
  getProductsValidator,
  getProductsForCustomersValidator,
};