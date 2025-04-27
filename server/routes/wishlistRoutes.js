const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { ensureAuthenticated, authorizeRoles } = require('../middleware/auth');
const { addToWishlistValidator, removeFromWishlistValidator } = require('../validation/wishlistValidators');

// Wishlist routes (under /api/wishlist)
router.post('/', 
  ensureAuthenticated, 
  authorizeRoles('user'), 
  addToWishlistValidator, 
  wishlistController.addToWishlist
);

router.get('/', 
  ensureAuthenticated, 
  authorizeRoles('user'), 
  wishlistController.getWishlist
);

router.delete('/:productId', 
  ensureAuthenticated, 
  authorizeRoles('user'), 
  removeFromWishlistValidator, 
  wishlistController.removeFromWishlist
);

router.delete('/:productId/:variantId', 
  ensureAuthenticated, 
  authorizeRoles('user'), 
  removeFromWishlistValidator, 
  wishlistController.removeFromWishlist
);

module.exports = router;