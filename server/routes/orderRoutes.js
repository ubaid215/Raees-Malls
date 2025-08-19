const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const {
  placeOrderValidator,
  updateOrderStatusValidator,
  getOrdersValidator,
  downloadInvoiceValidator,
} = require('../validation/orderValidators');

// User routes (under /api/orders)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('user', 'admin'),
  placeOrderValidator,
  orderController.placeOrder
);

router.get(
  '/user',
  authenticateJWT,
  authorizeRoles('user'),
  getOrdersValidator,
  orderController.getUserOrders
);

router.put(
  '/:orderId/cancel',
  authenticateJWT,
  authorizeRoles('user'),
  updateOrderStatusValidator,
  orderController.cancelOrder
);

// Notification routes (public access for toast notifications)
router.get(
  '/notifications/recent',
  orderController.getRecentOrderNotifications
);

// Revenue/Analytics routes (admin only)
router.get(
  '/analytics/revenue',
  authenticateJWT,
  authorizeRoles('admin'),
  orderController.getRevenueStats
);

router.get(
  '/analytics/products',
  authenticateJWT,
  authorizeRoles('admin'),
  orderController.getProductRevenue
);

// Admin routes
router.get(
  '/',
  authenticateJWT,
  authorizeRoles('admin'),
  getOrdersValidator,
  orderController.getAllOrders
);

router.put(
  '/:orderId/status',
  authenticateJWT,
  authorizeRoles('admin'),
  updateOrderStatusValidator,
  orderController.updateOrderStatus
);

router.get(
  '/:orderId/invoice',
  authenticateJWT,
  authorizeRoles('admin'),
  downloadInvoiceValidator,
  orderController.downloadInvoice
);

module.exports = router;