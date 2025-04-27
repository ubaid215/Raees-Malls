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

// Configure upload for baseImages and variantImages
const uploadFields = upload.fields([
  { name: 'baseImages', maxCount: 5 },
  { name: 'variantImages[0]', maxCount: 5 },
  { name: 'variantImages[1]', maxCount: 5 },
  { name: 'variantImages[2]', maxCount: 5 } // Adjust maxCount and indices based on needs
]);

// Public product routes (mounted under /api/products)
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
  uploadFields,
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
  uploadFields,
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