const { body, query } = require('express-validator');

exports.validateCreateSale = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Sale title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
    
  body('type')
    .isIn(['flash_sale', 'hot_deal', 'seasonal_sale', 'clearance', 'weekend_deal', 'mega_sale'])
    .withMessage('Invalid sale type'),
    
  body('startDate')
    .isISO8601()
    .withMessage('Valid start date is required'),
    
  body('endDate')
    .isISO8601()
    .withMessage('Valid end date is required')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
    
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one product must be added to the sale'),
    
  body('items.*.productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
    
  body('items.*.discountType')
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be percentage or fixed'),
    
  body('items.*.discountValue')
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),
];

exports.validateUpdateSale = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
    
  body('status')
    .optional()
    .isIn(['draft', 'scheduled', 'active', 'expired', 'cancelled'])
    .withMessage('Invalid status'),
];