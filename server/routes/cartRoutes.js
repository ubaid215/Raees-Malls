const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const {
  addToCartValidator,
  updateCartItemValidator,
  removeFromCartValidator,
  placeOrderFromCartValidator,
  getCartValidator,
  clearCartValidator
} = require('../validation/cartValidators');

// Cart routes (under /api/cart)

// Add item to cart
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('user'),
  addToCartValidator,
  cartController.addToCart
);

// Get user's cart
router.get(
  '/',
  authenticateJWT,
  authorizeRoles('user'),
  getCartValidator,
  cartController.getCart
);

// Update cart item quantity
router.put(
  '/',
  authenticateJWT,
  authorizeRoles('user'),
  updateCartItemValidator,
  cartController.updateCartItem
);

// Remove specific item from cart
router.delete(
  '/item',
  authenticateJWT,
  authorizeRoles('user'),
  removeFromCartValidator,
  cartController.removeFromCart
);

// Clear entire cart
router.delete(
  '/clear',
  authenticateJWT,
  authorizeRoles('user'),
  clearCartValidator,
  cartController.clearCart
);

// Place order from cart
router.post(
  '/order',
  authenticateJWT,
  authorizeRoles('user'),
  placeOrderFromCartValidator,
  cartController.placeOrderFromCart
);

module.exports = router;