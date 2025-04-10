// 📁 backend/routes/cartRoutes.js
const express = require('express');
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart
} = require('../controllers/cartController');
// const { authMiddleware } = require('../middlewares/auth'); // Comment out for now

const router = express.Router();

// Cart routes without authentication middleware for testing
router.post('/add', addToCart); // Remove authMiddleware
router.get('/:userId', getCart);
router.put('/update', updateCartItem);
router.delete('/remove/:productId', removeFromCart);

module.exports = router;