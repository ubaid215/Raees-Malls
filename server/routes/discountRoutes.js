const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { createDiscountValidator, discountIdValidator, getDiscountsValidator, applyDiscountValidator } = require('../validation/discountValidators');
const { apiLimiter } = require('../middleware/rateLimiter');

// Admin routes (under /api/admin/discounts)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('admin'),
  createDiscountValidator,
  discountController.createDiscount
);

router.get(
  '/',
  authenticateJWT,
  authorizeRoles('admin'),
  getDiscountsValidator,
  discountController.getAllDiscounts
);

router.get(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  discountIdValidator,
  discountController.getDiscountById
);

router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  createDiscountValidator,
  discountIdValidator,
  discountController.updateDiscount
);

router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  discountIdValidator,
  discountController.deleteDiscount
);

// Public route (under /api/discounts)
router.post('/apply', apiLimiter, applyDiscountValidator, discountController.applyDiscount);

module.exports = router;