const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');
const Category = require('../models/Category');
const Product = require('../models/Product');

// Helper function to parse JSON fields
const parseJsonField = (value) => {
  if (typeof value === 'string' && value) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

// Helper function to deep parse variant fields
const deepParseVariantFields = (variant) => {
  if (!variant) return variant;

  // Parse color
  if (variant.color && typeof variant.color === 'string') {
    try {
      variant.color = JSON.parse(variant.color);
    } catch {
      variant.color = { name: variant.color };
    }
  }

  // Parse storage options
  if (variant.storageOptions && typeof variant.storageOptions === 'string') {
    try {
      variant.storageOptions = JSON.parse(variant.storageOptions);
    } catch {
      variant.storageOptions = [];
    }
  }

  // Parse size options
  if (variant.sizeOptions && typeof variant.sizeOptions === 'string') {
    try {
      variant.sizeOptions = JSON.parse(variant.sizeOptions);
    } catch {
      variant.sizeOptions = [];
    }
  }

  return variant;
};

// Helper function to validate variant structure
const validateVariant = (variant, index) => {
  if (!variant) {
    throw new Error(`Variant ${index + 1}: Variant data is required`);
  }

  // Validate color
  if (!variant.color || !variant.color.name || typeof variant.color.name !== 'string') {
    throw new Error(`Variant ${index + 1}: Color name is required and must be a string`);
  }
  if (variant.color.name.length > 50) {
    throw new Error(`Variant ${index + 1}: Color name cannot exceed 50 characters`);
  }

  // Check variant type - FIXED LOGIC
  const hasDirectPricing = (variant.price !== undefined && variant.price !== null && variant.price > 0) && 
                          (variant.stock !== undefined && variant.stock !== null);
  
  const hasStorageOptions = Array.isArray(variant.storageOptions) && variant.storageOptions.length > 0;
  const hasSizeOptions = Array.isArray(variant.sizeOptions) && variant.sizeOptions.length > 0;

  // Count actual pricing types (not just presence of fields)
  const variantTypes = [hasDirectPricing, hasStorageOptions, hasSizeOptions].filter(Boolean);
  
  // Debug logging
  console.log(`Variant ${index + 1} validation:`, {
    hasDirectPricing,
    hasStorageOptions,
    hasSizeOptions,
    variantTypes: variantTypes.length,
    price: variant.price,
    stock: variant.stock,
    storageOptionsCount: variant.storageOptions?.length || 0,
    sizeOptionsCount: variant.sizeOptions?.length || 0
  });

  if (variantTypes.length === 0) {
    throw new Error(`Variant ${index + 1} must have at least one pricing type (direct pricing, storage options, or size options)`);
  }

  if (variantTypes.length > 1) {
    throw new Error(`Variant ${index + 1} must have exactly one pricing type (direct pricing, storage options, or size options)`);
  }

  // Validate based on variant type
  if (hasDirectPricing) {
    // Direct pricing validation
    if (isNaN(parseFloat(variant.price))) {
      throw new Error(`Variant ${index + 1}: Price must be a number`);
    }
    if (parseFloat(variant.price) <= 0) {
      throw new Error(`Variant ${index + 1}: Price must be greater than 0`);
    }
    if (isNaN(parseInt(variant.stock))) {
      throw new Error(`Variant ${index + 1}: Stock must be an integer`);
    }
    if (parseInt(variant.stock) < 0) {
      throw new Error(`Variant ${index + 1}: Stock cannot be negative`);
    }
    if (variant.discountPrice !== undefined && variant.discountPrice !== '' && variant.discountPrice !== null) {
      if (isNaN(parseFloat(variant.discountPrice))) {
        throw new Error(`Variant ${index + 1}: Discount price must be a number`);
      }
      if (parseFloat(variant.discountPrice) < 0) {
        throw new Error(`Variant ${index + 1}: Discount price cannot be negative`);
      }
      if (parseFloat(variant.discountPrice) >= parseFloat(variant.price)) {
        throw new Error(`Variant ${index + 1}: Discount price must be less than price`);
      }
    }
  } else if (hasStorageOptions) {
    // Storage options validation
    if (!Array.isArray(variant.storageOptions) || variant.storageOptions.length === 0) {
      throw new Error(`Variant ${index + 1}: Storage options must be a non-empty array`);
    }
    
    variant.storageOptions.forEach((option, optIndex) => {
      if (!option || typeof option !== 'object') {
        throw new Error(`Variant ${index + 1}, Storage option ${optIndex + 1}: Invalid storage option format`);
      }
      
      if (!option.capacity || typeof option.capacity !== 'string') {
        throw new Error(`Variant ${index + 1}, Storage option ${optIndex + 1}: Capacity is required and must be a string`);
      }
      
      if (option.capacity.length > 50) {
        throw new Error(`Variant ${index + 1}, Storage option ${optIndex + 1}: Capacity cannot exceed 50 characters`);
      }
      
      if (option.price !== undefined && option.price !== null && option.price !== '') {
        if (isNaN(parseFloat(option.price))) {
          throw new Error(`Variant ${index + 1}, Storage option ${optIndex + 1}: Price must be a number`);
        }
        if (parseFloat(option.price) < 0) {
          throw new Error(`Variant ${index + 1}, Storage option ${optIndex + 1}: Price cannot be negative`);
        }
      }
      
      if (option.discountPrice !== undefined && option.discountPrice !== '' && option.discountPrice !== null) {
        if (isNaN(parseFloat(option.discountPrice))) {
          throw new Error(`Variant ${index + 1}, Storage option ${optIndex + 1}: Discount price must be a number`);
        }
        if (parseFloat(option.discountPrice) < 0) {
          throw new Error(`Variant ${index + 1}, Storage option ${optIndex + 1}: Discount price cannot be negative`);
        }
        if (option.price && parseFloat(option.discountPrice) >= parseFloat(option.price)) {
          throw new Error(`Variant ${index + 1}, Storage option ${optIndex + 1}: Discount price must be less than price`);
        }
      }
      
      if (option.stock !== undefined && option.stock !== null && option.stock !== '') {
        if (isNaN(parseInt(option.stock))) {
          throw new Error(`Variant ${index + 1}, Storage option ${optIndex + 1}: Stock must be an integer`);
        }
        if (parseInt(option.stock) < 0) {
          throw new Error(`Variant ${index + 1}, Storage option ${optIndex + 1}: Stock cannot be negative`);
        }
      }
    });
  } else if (hasSizeOptions) {
    // Size options validation
    if (!Array.isArray(variant.sizeOptions) || variant.sizeOptions.length === 0) {
      throw new Error(`Variant ${index + 1}: Size options must be a non-empty array`);
    }
    
    variant.sizeOptions.forEach((option, optIndex) => {
      if (!option || typeof option !== 'object') {
        throw new Error(`Variant ${index + 1}, Size option ${optIndex + 1}: Invalid size option format`);
      }
      
      if (!option.size || typeof option.size !== 'string') {
        throw new Error(`Variant ${index + 1}, Size option ${optIndex + 1}: Size is required and must be a string`);
      }
      
      if (option.size.length > 50) {
        throw new Error(`Variant ${index + 1}, Size option ${optIndex + 1}: Size cannot exceed 50 characters`);
      }
      
      if (option.price !== undefined && option.price !== null && option.price !== '') {
        if (isNaN(parseFloat(option.price))) {
          throw new Error(`Variant ${index + 1}, Size option ${optIndex + 1}: Price must be a number`);
        }
        if (parseFloat(option.price) < 0) {
          throw new Error(`Variant ${index + 1}, Size option ${optIndex + 1}: Price cannot be negative`);
        }
      }
      
      if (option.discountPrice !== undefined && option.discountPrice !== '' && option.discountPrice !== null) {
        if (isNaN(parseFloat(option.discountPrice))) {
          throw new Error(`Variant ${index + 1}, Size option ${optIndex + 1}: Discount price must be a number`);
        }
        if (parseFloat(option.discountPrice) < 0) {
          throw new Error(`Variant ${index + 1}, Size option ${optIndex + 1}: Discount price cannot be negative`);
        }
        if (option.price && parseFloat(option.discountPrice) >= parseFloat(option.price)) {
          throw new Error(`Variant ${index + 1}, Size option ${optIndex + 1}: Discount price must be less than price`);
        }
      }
      
      if (option.stock !== undefined && option.stock !== null && option.stock !== '') {
        if (isNaN(parseInt(option.stock))) {
          throw new Error(`Variant ${index + 1}, Size option ${optIndex + 1}: Stock must be an integer`);
        }
        if (parseInt(option.stock) < 0) {
          throw new Error(`Variant ${index + 1}, Size option ${optIndex + 1}: Stock cannot be negative`);
        }
      }
    });
  }

  return true;
};

// Common product validators
const commonProductValidators = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Product title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Product title must be between 3 and 100 characters'),

  body('description')
  .optional({ checkFalsy: true }) 
  .trim()
  .isLength({ min: 10, max: 3000 })
  .withMessage('If provided, product description must be between 10 and 3000 characters'),


  body('price')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Price must be a non-negative number');
      }
      return true;
    })
    .customSanitizer((value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      return parseFloat(value);
    }),

  body('discountPrice')
    .optional()
    .custom((value, { req }) => {
      if (value === '' || value === undefined || value === null) return true;
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Discount price must be a non-negative number');
      }
      const price = req.body.price !== undefined ? parseFloat(req.body.price) : req.product?.price;
      if (price && num >= price) {
        throw new Error('Discount price must be less than the price');
      }
      return true;
    })
    .customSanitizer((value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      return parseFloat(value);
    }),

  body('shippingCost')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Shipping cost must be a non-negative number');
      }
      return true;
    })
    .customSanitizer((value) => {
      if (value === '' || value === null || value === undefined) return 0;
      return parseFloat(value);
    }),

  body('categoryId')
    .notEmpty()
    .withMessage('Category is required')
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
    .trim()
    .notEmpty()
    .withMessage('Brand is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Brand must be between 2 and 50 characters'),

  body('stock')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      const num = parseInt(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Stock must be a non-negative integer');
      }
      return true;
    })
    .customSanitizer((value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      return parseInt(value);
    }),

  body('sku')
    .optional()
    .trim()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      if (!/^[A-Z0-9-]*$/.test(value)) {
        throw new Error('SKU can only contain letters, numbers, and hyphens');
      }
      if (value.length > 20) {
        throw new Error('SKU must not exceed 20 characters');
      }
      return true;
    })
    .custom(async (value, { req }) => {
      if (value && value !== '') {
        const query = { sku: value };
        if (req.params?.id) {
          query._id = { $ne: req.params.id };
        }
        const product = await Product.findOne(query);
        if (product) {
          throw new Error('SKU must be unique');
        }
      }
      return true;
    }),

  body('color')
    .optional()
    .customSanitizer(parseJsonField)
    .custom((value) => {
      if (value && value.name) {
        if (typeof value.name !== 'string' || value.name.length > 50) {
          throw new Error('Color name must be a string with max 50 characters');
        }
      } else if (typeof value === 'string' && value) {
        return { name: value };
      }
      return true;
    }),

  body('images')
    .optional()
    .customSanitizer(parseJsonField)
    .custom((images) => {
      if (!images) return true;
      if (!Array.isArray(images)) {
        throw new Error('Images must be an array');
      }
      if (images.length > 0) {
        const isValid = images.every(img => 
          img && 
          typeof img.url === 'string' && 
          typeof img.public_id === 'string' && 
          (!img.alt || typeof img.alt === 'string')
        );
        if (!isValid) {
          throw new Error('Each image must have a url and public_id as strings, and an optional alt string');
        }
      }
      return true;
    }),

  body('videos')
    .optional()
    .customSanitizer(parseJsonField)
    .custom((videos) => {
      if (!videos) return true;
      if (!Array.isArray(videos)) {
        throw new Error('Videos must be an array');
      }
      if (videos.length > 0) {
        const isValid = videos.every(vid => 
          vid && 
          typeof vid.url === 'string' && 
          typeof vid.public_id === 'string' && 
          (!vid.alt || typeof vid.alt === 'string')
        );
        if (!isValid) {
          throw new Error('Each video must have a url and public_id as strings, and an optional alt string');
        }
      }
      return true;
    }),

  body('seo')
    .optional()
    .customSanitizer(parseJsonField)
    .custom((seo) => {
      if (!seo) return true;
      if (typeof seo !== 'object') {
        throw new Error('SEO must be an object');
      }
      if (seo.title && (typeof seo.title !== 'string' || seo.title.length > 60)) {
        throw new Error('SEO title must be a string with max 60 characters');
      }
      if (seo.description && (typeof seo.description !== 'string' || seo.description.length > 3000)) {
        throw new Error('SEO description must be a string with max 3000 characters');
      }
      return true;
    }),

  body('isFeatured')
    .optional()
    .customSanitizer((value) => {
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false) return false;
      return value;
    })
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),

  body('specifications')
    .optional()
    .customSanitizer(parseJsonField)
    .custom((specs) => {
      if (!specs) return true;
      if (!Array.isArray(specs)) {
        throw new Error('Specifications must be an array');
      }
      if (specs.length > 0) {
        const isValid = specs.every(spec => 
          spec && 
          spec.key && 
          spec.value && 
          typeof spec.key === 'string' && 
          typeof spec.value === 'string'
        );
        if (!isValid) {
          throw new Error('Each specification must have a key and value as strings');
        }
      }
      return true;
    }),

  body('features')
    .optional()
    .customSanitizer(parseJsonField)
    .custom((features) => {
      if (!features) return true;
      if (!Array.isArray(features)) {
        throw new Error('Features must be an array');
      }
      if (features.length > 0) {
        const isValid = features.every(f => 
          typeof f === 'string' && 
          f.trim().length >= 1 && 
          f.trim().length <= 200
        );
        if (!isValid) {
          throw new Error('Each feature must be a string between 1 and 200 characters');
        }
      }
      return true;
    }),
];

// Create product validator
const createProductValidator = [
  ...commonProductValidators,

  // Variants validation with comprehensive error handling
  body('variants')
    .optional()
    .customSanitizer((value) => {
      try {
        return parseJsonField(value);
      } catch (error) {
        console.error('JSON parsing error for variants:', error.message);
        return value;
      }
    })
    .custom((variants, { req }) => {
      try {
        console.log('Raw variants input:', JSON.stringify(variants, null, 2));
        
        // Handle case where variants is not provided or is null/undefined
        if (!variants) {
          variants = [];
        }

        // Ensure variants is an array
        if (!Array.isArray(variants)) {
          throw new Error('Variants must be an array');
        }

        // Parse variants with error handling
        const parsedVariants = variants.map((variant, index) => {
          try {
            const parsed = deepParseVariantFields(variant);
            console.log(`Parsed variant ${index}:`, JSON.stringify(parsed, null, 2));
            return parsed;
          } catch (error) {
            throw new Error(`Invalid variant at index ${index}: ${error.message}`);
          }
        });

        req.body.variants = parsedVariants;

        // Check for base pricing - more robust check
        const hasBasePricing = req.body.price !== undefined && 
                              req.body.price !== null && 
                              req.body.price !== '' &&
                              req.body.price > 0 &&
                              req.body.stock !== undefined && 
                              req.body.stock !== null && 
                              req.body.stock !== '';

        const hasVariants = parsedVariants && parsedVariants.length > 0;

        console.log('Product pricing validation:', {
          hasBasePricing,
          hasVariants,
          basePrice: req.body.price,
          baseStock: req.body.stock,
          variantCount: parsedVariants.length
        });

        // Product must have either base pricing or variants
        if (!hasBasePricing && !hasVariants) {
          throw new Error('Product must have either base price/stock or variants');
        }

        // If has both base pricing and variants, that's also invalid
        if (hasBasePricing && hasVariants) {
          throw new Error('Product cannot have both base pricing and variants. Choose one approach.');
        }

        // Validate each variant if variants exist
        if (hasVariants) {
          for (let i = 0; i < parsedVariants.length; i++) {
            const variant = parsedVariants[i];
            try {
              validateVariant(variant, i);
            } catch (error) {
              throw new Error(`Variant validation error at index ${i}: ${error.message}`);
            }
          }
        }

        return true;
      } catch (error) {
        console.error('Variants validation error:', error.message);
        throw error;
      }
    }),

  // Final validation handler
  (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Validation errors:', JSON.stringify(errors.array(), null, 2));
        console.error('Request body:', JSON.stringify(req.body, null, 2));
        return next(new ApiError(400, 'Validation failed', errors.array()));
      }
      next();
    } catch (error) {
      console.error('Validation handler error:', error);
      return next(new ApiError(500, 'Internal validation error', error.message));
    }
  }
];

// Update product validator
const updateProductValidator = [
  ...commonProductValidators,

  // Variants validation for updates
  body('variants')
    .optional()
    .customSanitizer(parseJsonField)
    .custom((variants, { req }) => {
      try {
        console.log('UpdateProductValidator: Incoming variants data:', JSON.stringify(variants, null, 2));
        
        if (!variants) {
          variants = [];
        }

        if (!Array.isArray(variants)) {
          throw new Error('Variants must be an array');
        }

        const parsedVariants = variants.map((variant, index) => {
          try {
            return deepParseVariantFields(variant);
          } catch (error) {
            throw new Error(`Invalid variant at index ${index}: ${error.message}`);
          }
        });

        req.body.variants = parsedVariants;

        console.log('UpdateProductValidator: Parsed variants:', JSON.stringify(parsedVariants, null, 2));

        // Check for base pricing in update
        const hasBasePricing = req.body.price !== undefined && 
                              req.body.price !== null && 
                              req.body.price !== '' &&
                              req.body.price > 0 &&
                              req.body.stock !== undefined && 
                              req.body.stock !== null && 
                              req.body.stock !== '';

        const existingHasBasePricing = req.product?.price !== undefined && 
                                     req.product?.price > 0 && 
                                     req.product?.stock !== undefined;

        const hasVariants = parsedVariants && parsedVariants.length > 0;
        const existingHasVariants = req.product?.variants && req.product.variants.length > 0;

        console.log('UpdateProductValidator: Validation checks:', {
          hasBasePricing,
          existingHasBasePricing,
          hasVariants,
          existingHasVariants,
        });

        // For updates, we need to ensure the product will have some form of pricing after update
        const willHaveBasePricing = hasBasePricing || (existingHasBasePricing && !hasVariants);
        const willHaveVariants = hasVariants;

        if (!willHaveBasePricing && !willHaveVariants) {
          throw new Error('Product must have either base price/stock or variants after update');
        }

        // If updating to have both, that's invalid
        if (willHaveBasePricing && willHaveVariants) {
          throw new Error('Product cannot have both base pricing and variants. Choose one approach.');
        }

        // Validate each variant if variants exist
        if (hasVariants) {
          for (let i = 0; i < parsedVariants.length; i++) {
            const variant = parsedVariants[i];
            try {
              validateVariant(variant, i);
            } catch (error) {
              throw new Error(`Variant validation error at index ${i}: ${error.message}`);
            }
          }
        }

        return true;
      } catch (error) {
        console.error('UpdateProductValidator: Variants validation error:', error.message);
        throw error;
      }
    }),

  // Final validation handler
  (req, res, next) => {
    console.log('UpdateProductValidator: Final validation check');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('UpdateProductValidator: Validation errors:', JSON.stringify(errors.array(), null, 2));
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    console.log('UpdateProductValidator: Validation passed');
    next();
  }
];

// Product ID validator
const productIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Common query validators
const commonQueryValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

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
    .withMessage('Minimum price must be a non-negative number')
    .toFloat(),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a non-negative number')
    .toFloat(),

  query('color')
    .optional()
    .isString()
    .withMessage('Color must be a string')
    .isLength({ max: 50 })
    .withMessage('Color name cannot exceed 50 characters'),

  query('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
];

// Get products validator
const getProductsValidator = [
  ...commonQueryValidators,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }
    next();
  }
];

// Get products for customers validator
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
  }
];



module.exports = {
  createProductValidator,
  updateProductValidator,
  productIdValidator,
  getProductsValidator,
  getProductsForCustomersValidator,
};