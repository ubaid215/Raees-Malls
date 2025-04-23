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

router.get('/',
  ensureAuthenticated,
  authorizeRoles('user'),
  getOrdersValidator,
  orderController.getUserOrders
);

// Admin routes (under /api/admin/orders)
router.get('/admin',
  ensureAuthenticated,
  authorizeRoles('admin'),
  getOrdersValidator,
  orderController.getAllOrders
);

router.put('/admin/:orderId',
  ensureAuthenticated,
  authorizeRoles('admin'),
  updateOrderStatusValidator,
  orderController.updateOrderStatus
);

router.get('/admin/invoice/:orderId',
  ensureAuthenticated,
  authorizeRoles('admin'),
  downloadInvoiceValidator,
  orderController.downloadInvoice
);

module.exports = router;