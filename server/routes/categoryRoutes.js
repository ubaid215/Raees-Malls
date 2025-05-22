const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createCategoryValidator,
  updateCategoryValidator,
  categoryIdValidator,
  getCategoriesValidator,
  getCategoriesForCustomersValidator,
} = require('../validation/categoryValidators');
const { getProductsForCustomersValidator } = require('../validation/productValidators');

// Admin category management routes (under /api/admin/categories)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('admin'),
  upload.single('image'),
  createCategoryValidator,
  categoryController.createCategory
);

router.get(
  '/',
  authenticateJWT,
  authorizeRoles('admin'),
  getCategoriesValidator,
  categoryController.getAllCategories
);

router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  upload.single('image'),
  categoryIdValidator,
  updateCategoryValidator,
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  categoryIdValidator,
  categoryController.deleteCategory
);

// Public category routes (under /api/categories)
router.get('/public', getCategoriesForCustomersValidator, categoryController.getAllCategoriesForCustomers);

router.get('/public/:id', categoryIdValidator, categoryController.getCategoryByIdForCustomers);

router.get(
  '/public/:id/products',
  categoryIdValidator,
  getProductsForCustomersValidator,
  categoryController.getCategoryProductsForCustomers
);

module.exports = router;