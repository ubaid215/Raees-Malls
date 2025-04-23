const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { ensureAuthenticated, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createProductValidator,
  updateProductValidator,
  productIdValidator,
  getProductsValidator,
  getProductsForCustomersValidator
} = require('../validation/productValidators');

// Public product routes (mounted under /api/products)
// Note: Static routes must come before dynamic routes to avoid conflicts
router.get('/public',
  getProductsForCustomersValidator,
  productController.getAllProductsForCustomers
);

router.get('/public/:id',
  productIdValidator,
  productController.getProductDetailsForCustomers
);

// Admin product management routes (mounted under /api/admin/products)
router.post('/',
  ensureAuthenticated,
  authorizeRoles('admin'),
  upload.array('images', 5), // Allow up to 5 images for product creation
  createProductValidator,
  productController.createProduct
);

router.get('/',
  ensureAuthenticated,
  authorizeRoles('admin'),
  getProductsValidator,
  productController.getAllProducts
);

router.get('/:id',
  ensureAuthenticated,
  authorizeRoles('admin'),
  productIdValidator,
  productController.getProductById
);

router.put('/:id',
  ensureAuthenticated,
  authorizeRoles('admin'),
  upload.array('images', 5), // Allow up to 5 images for product update
  productIdValidator,
  updateProductValidator,
  productController.updateProduct
);

router.delete('/:id',
  ensureAuthenticated,
  authorizeRoles('admin'),
  productIdValidator,
  productController.deleteProduct
);

module.exports = router;