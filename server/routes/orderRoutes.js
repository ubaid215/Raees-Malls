const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const {
  placeOrderValidator,
  updateOrderStatusValidator,
  getOrdersValidator,
  downloadInvoiceValidator,
  cancelOrderValidator,
  checkPaymentStatusValidator,
  retryPaymentValidator,
  ipnHandlerValidator,
  paymentReturnValidator,
  revenueStatsValidator,
  productRevenueValidator,
  recentNotificationsValidator
} = require('../validation/orderValidators');

// =============================================
// USER ROUTES (Authenticated Users)
// =============================================

// Place a new order
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('user', 'admin'),
  placeOrderValidator,
  orderController.placeOrder
);

// Get user's orders
router.get(
  '/user',
  authenticateJWT,
  authorizeRoles('user'),
  getOrdersValidator,
  orderController.getUserOrders
);

// Cancel user's order
router.put(
  '/:orderId/cancel',
  authenticateJWT,
  authorizeRoles('user'),
  cancelOrderValidator,
  orderController.cancelOrder
);

// =============================================
// PAYMENT ROUTES
// =============================================

// Bank Alfalah IPN (Instant Payment Notification) - Public endpoint
router.post(
  '/payment/ipn',
  ipnHandlerValidator,
  orderController.handlePaymentIPN
);

// Payment return URL (after payment completion) - Public endpoint
router.get(
  '/payment/return',
  paymentReturnValidator,
  orderController.handlePaymentReturn
);

// Check payment status for an order
router.get(
  '/:orderId/payment/status',
  authenticateJWT,
  authorizeRoles('user', 'admin'),
  checkPaymentStatusValidator,
  orderController.checkPaymentStatus
);

// Retry failed payment
router.post(
  '/:orderId/payment/retry',
  authenticateJWT,
  authorizeRoles('user'),
  retryPaymentValidator,
  orderController.retryPayment
);

// Sync payment status
router.post(
  '/:orderId/payment/sync',
  authenticateJWT,
  authorizeRoles('user', 'admin'),
  checkPaymentStatusValidator,
  orderController.syncPaymentStatus
);

// Get payment sync history
router.get(
  '/:orderId/payment/sync-history',
  authenticateJWT,
  authorizeRoles('user', 'admin'),
  checkPaymentStatusValidator,
  orderController.getPaymentSyncHistory
);

// =============================================
// NOTIFICATION ROUTES (Mixed Access)
// =============================================

// Recent order notifications (public access for toast notifications)
router.get(
  '/notifications/recent',
  recentNotificationsValidator,
  orderController.getRecentOrderNotifications
);

// =============================================
// ANALYTICS & REPORTING ROUTES (Admin Only)
// =============================================

// Revenue statistics
router.get(
  '/analytics/revenue',
  authenticateJWT,
  authorizeRoles('admin'),
  revenueStatsValidator,
  orderController.getRevenueStats
);

// Product revenue analytics
router.get(
  '/analytics/products',
  authenticateJWT,
  authorizeRoles('admin'),
  productRevenueValidator,
  orderController.getProductRevenue
);

// =============================================
// ADMIN MANAGEMENT ROUTES (Admin Only)
// =============================================

// Get all orders (with filtering and pagination)
router.get(
  '/',
  authenticateJWT,
  authorizeRoles('admin'),
  getOrdersValidator,
  orderController.getAllOrders
);

// Update order status
router.put(
  '/:orderId/status',
  authenticateJWT,
  authorizeRoles('admin'),
  updateOrderStatusValidator,
  orderController.updateOrderStatus
);

// Download order invoice
router.get(
  '/:orderId/invoice',
  authenticateJWT,
  authorizeRoles('admin', 'user'),
  downloadInvoiceValidator,
  orderController.downloadInvoice
);

// =============================================
// ORDER DETAILS ROUTES (User & Admin)
// =============================================

// Get order details by ID (shared route - users can see their own, admins can see all)
router.get(
  '/:orderId',
  authenticateJWT,
  authorizeRoles('user', 'admin'),
  checkPaymentStatusValidator,
  orderController.getOrderDetails
);

module.exports = router;