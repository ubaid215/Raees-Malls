const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { validateCreateSale, validateUpdateSale } = require('../validation/salesValidator');

// Public routes
router.get('/active', salesController.getActiveSales);
router.get('/public/:id', salesController.getSaleById);
router.get('/page-data', salesController.getSalesPageData);
router.get('/type/:type', salesController.getActiveSalesByType);

// Protected routes (Admin/Manager only)
router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'manager'));

router.route('/')
  .get(salesController.getAllSales)
  .post(validateCreateSale, salesController.createSale);

router.route('/:id')
  .put(validateUpdateSale, salesController.updateSale)
  .delete(salesController.deleteSale);

module.exports = router;
