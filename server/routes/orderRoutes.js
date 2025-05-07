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

router.get('/user',
  ensureAuthenticated,
  authorizeRoles('user'),
  getOrdersValidator,
  orderController.getUserOrders
);

router.put('/:orderId/cancel',
  ensureAuthenticated,
  authorizeRoles('user'),
  updateOrderStatusValidator,
  orderController.cancelOrder
);

// Admin routes
router.get('/',
  ensureAuthenticated,
  authorizeRoles('admin'),
  getOrdersValidator,
  orderController.getAllOrders
);

router.put('/:orderId/status',
  ensureAuthenticated,
  authorizeRoles('admin'),
  updateOrderStatusValidator,
  orderController.updateOrderStatus
);

router.get('/:orderId/invoice',
  ensureAuthenticated,
  authorizeRoles('admin'),
  downloadInvoiceValidator,
  orderController.downloadInvoice
);

module.exports = router;