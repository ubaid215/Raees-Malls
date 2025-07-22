const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const {
  createProductValidator,
  updateProductValidator,
  productIdValidator,
  getProductsValidator,
  getProductsForCustomersValidator,
} = require('../validation/productValidators');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes for customers
router.get('/public', getProductsForCustomersValidator, productController.getAllProductsForCustomers);
router.get('/public/:id', productIdValidator, productController.getProductDetailsForCustomers);
router.get('/public/featured', getProductsForCustomersValidator, productController.getFeaturedProducts);

// Admin routes
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('admin'),
  upload.fields([
    { name: 'baseImages', maxCount: 10 },
    { name: 'baseVideos', maxCount: 5 }
    // Variant fields are now handled dynamically in upload middleware
  ]),
  createProductValidator,
  productController.createProduct
);

router.get(
  '/',
  authenticateJWT,
  authorizeRoles('admin'),
  getProductsValidator,
  productController.getAllProducts
);

router.get(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  productIdValidator,
  productController.getProductById
);

router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  upload.fields([
    { name: 'baseImages', maxCount: 10 },
    { name: 'baseVideos', maxCount: 5 }
    // Variant fields are now handled dynamically in upload middleware
  ]),
  updateProductValidator,
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  productIdValidator,
  productController.deleteProduct
);

module.exports = router;