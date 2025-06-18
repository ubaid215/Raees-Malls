const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { addToWishlistValidator, removeFromWishlistValidator } = require('../validation/wishlistValidators');

// Wishlist routes (under /api/wishlist)
router.post('/', 
  addToWishlistValidator, 
  wishlistController.addToWishlist
);

router.get('/', 
  wishlistController.getWishlist
);

router.delete('/:productId', 
  removeFromWishlistValidator, 
  wishlistController.removeFromWishlist
);

router.delete('/:productId/:variantId', 
  removeFromWishlistValidator, 
  wishlistController.removeFromWishlist
);

module.exports = router;