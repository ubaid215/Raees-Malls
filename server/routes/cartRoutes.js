const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { addToCartValidator, removeFromCartValidator, placeOrderFromCartValidator } = require('../validation/cartValidators');

// Cart routes (under /api/cart)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('user'),
  addToCartValidator,
  cartController.addToCart
);

router.get(
  '/',
  authenticateJWT,
  authorizeRoles('user'),
  cartController.getCart
);

router.delete(
  '/:productId',
  authenticateJWT,
  authorizeRoles('user'),
  removeFromCartValidator,
  cartController.removeFromCart
);

router.delete(
  '/:productId/:variantId',
  authenticateJWT,
  authorizeRoles('user'),
  removeFromCartValidator,
  cartController.removeFromCart
);

router.delete(
  '/',
  authenticateJWT,
  authorizeRoles('user'),
  cartController.clearCart
);

router.post(
  '/order',
  authenticateJWT,
  authorizeRoles('user'),
  placeOrderFromCartValidator,
  cartController.placeOrderFromCart
);

module.exports = router;