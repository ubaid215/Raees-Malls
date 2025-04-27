const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { ensureAuthenticated, authorizeRoles } = require('../middleware/auth');
const { createDiscountValidator, discountIdValidator, getDiscountsValidator, applyDiscountValidator } = require('../validation/discountValidators');
const { apiLimiter } = require('../middleware/rateLimiter');

// Admin routes (under /api/admin/discounts)
router.post('/', 
  ensureAuthenticated, 
  authorizeRoles('admin'), 
  createDiscountValidator, 
  discountController.createDiscount
);

router.get('/', 
  ensureAuthenticated, 
  authorizeRoles('admin'), 
  getDiscountsValidator, 
  discountController.getAllDiscounts
);

router.get('/:id', 
  ensureAuthenticated, 
  authorizeRoles('admin'), 
  discountIdValidator, 
  discountController.getDiscountById
);

router.put('/:id', 
  ensureAuthenticated, 
  authorizeRoles('admin'), 
  createDiscountValidator, 
  discountIdValidator, 
  discountController.updateDiscount
);

router.delete('/:id', 
  ensureAuthenticated, 
  authorizeRoles('admin'), 
  discountIdValidator, 
  discountController.deleteDiscount
);

// Public route (under /api/discounts)
router.post('/apply', 
  apiLimiter, 
  applyDiscountValidator, 
  discountController.applyDiscount
);

module.exports = router;