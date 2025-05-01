const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { ensureAuthenticated, authorizeRoles } = require('../middleware/auth');
const {
  placeOrderValidator,
  updateOrderStatusValidator,
  getOrdersValidator,
  downloadInvoiceValidator
} = require('../validation/orderValidators');

// User routes (under /api/orders)
router.post('/',
  ensureAuthenticated,
  authorizeRoles('user', 'admin'),
  placeOrderValidator,
  orderController.placeOrder
);

// Updated to match frontend call to /api/orders/user
router.get('/user',
  ensureAuthenticated,
  authorizeRoles('user'),
  getOrdersValidator,
  orderController.getUserOrders
);

// Admin routes
router.get('/',
  ensureAuthenticated,
  authorizeRoles('admin'),
  getOrdersValidator,
  orderController.getAllOrders
);

// Updated to match frontend call to /api/orders/:orderId/status
router.put('/:orderId/status',
  ensureAuthenticated,
  authorizeRoles('admin'),
  updateOrderStatusValidator,
  orderController.updateOrderStatus
);

// Updated to match frontend call to /api/orders/:orderId/invoice
router.get('/:orderId/invoice',
  ensureAuthenticated,
  authorizeRoles('admin'),
  downloadInvoiceValidator,
  orderController.downloadInvoice
);

module.exports = router;