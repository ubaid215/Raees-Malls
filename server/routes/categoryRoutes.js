const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { ensureAuthenticated, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createCategoryValidator,
  updateCategoryValidator,
  categoryIdValidator,
  getCategoriesValidator,
  getCategoriesForCustomersValidator
} = require('../validation/categoryValidators');
const { getProductsForCustomersValidator } = require('../validation/productValidators');

// Admin category management routes (under /api/admin/categories)
router.post(
  '/',
  ensureAuthenticated,
  authorizeRoles('admin'),
  upload.single('image', 'categories'), // Specify folder as 'categories'
  (req, res, next) => {
    console.log('Request Body:', req.body, 'File:', req.file); // Debug log
    next();
  },
  createCategoryValidator,
  categoryController.createCategory
);

router.get('/',
  ensureAuthenticated,
  authorizeRoles('admin'),
  getCategoriesValidator,
  categoryController.getAllCategories
);

router.put('/:id',
  ensureAuthenticated,
  authorizeRoles('admin'),
  upload.single('image'), // Add this middleware for file upload
  categoryIdValidator,
  updateCategoryValidator,
  categoryController.updateCategory
);

router.put('/:id',
  ensureAuthenticated,
  authorizeRoles('admin'),
  categoryIdValidator,
  updateCategoryValidator,
  categoryController.updateCategory
);

router.delete('/:id',
  ensureAuthenticated,
  authorizeRoles('admin'),
  categoryIdValidator,
  categoryController.deleteCategory
);

// Public category routes (will be mounted under /api/categories)
router.get('/public',
  getCategoriesForCustomersValidator,
  categoryController.getAllCategoriesForCustomers
);

router.get('/public/:id',
  categoryIdValidator,
  categoryController.getCategoryByIdForCustomers
);

router.get('/public/:id/products',
  categoryIdValidator,
  getProductsForCustomersValidator,
  categoryController.getCategoryProductsForCustomers
);

module.exports = router;