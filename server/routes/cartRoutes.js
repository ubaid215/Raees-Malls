const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { ensureAuthenticated, authorizeRoles } = require('../middleware/auth');
const { addToCartValidator, removeFromCartValidator, placeOrderFromCartValidator } = require('../validation/cartValidators');

// Cart routes (under /api/cart)
router.post('/',
  ensureAuthenticated,
  authorizeRoles('user'),
  addToCartValidator,
  cartController.addToCart
);

router.get('/',
  ensureAuthenticated,
  authorizeRoles('user'),
  cartController.getCart
);

// Split the delete route to avoid optional parameter
router.delete('/:productId',
  ensureAuthenticated,
  authorizeRoles('user'),
  removeFromCartValidator,
  cartController.removeFromCart
);

router.delete('/:productId/:variantId',
  ensureAuthenticated,
  authorizeRoles('user'),
  removeFromCartValidator,
  cartController.removeFromCart
);

router.delete('/',
  ensureAuthenticated,
  authorizeRoles('user'),
  cartController.clearCart
);

router.post('/order',
  ensureAuthenticated,
  authorizeRoles('user'),
  placeOrderFromCartValidator,
  cartController.placeOrderFromCart
);

module.exports = router;