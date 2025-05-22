const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// Public routes
router.get('/public', productController.getAllProductsForCustomers);
router.get('/public/:id', productController.getProductDetailsForCustomers);
router.get('/public/featured', productController.getFeaturedProducts);

// Admin routes
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('admin'),
  upload.fields([
    { name: 'baseImages', maxCount: 10 },
    { name: 'baseVideos', maxCount: 5 },
    { name: 'variantImages[0]', maxCount: 10 },
    { name: 'variantImages[1]', maxCount: 10 },
    { name: 'variantImages[2]', maxCount: 10 },
    { name: 'variantVideos[0]', maxCount: 5 },
    { name: 'variantVideos[1]', maxCount: 5 },
    { name: 'variantVideos[2]', maxCount: 5 }
  ]),
  productController.createProduct
);

// Other routes remain the same...
router.get('/', authenticateJWT, authorizeRoles('admin'), productController.getAllProducts);
router.get('/:id', authenticateJWT, authorizeRoles('admin'), productController.getProductById);
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  upload.fields([
    { name: 'baseImages', maxCount: 10 },
    { name: 'baseVideos', maxCount: 5 },
    { name: 'variantImages[0]', maxCount: 10 },
    { name: 'variantImages[1]', maxCount: 10 },
    { name: 'variantImages[2]', maxCount: 10 },
    { name: 'variantVideos[0]', maxCount: 5 },
    { name: 'variantVideos[1]', maxCount: 5 },
    { name: 'variantVideos[2]', maxCount: 5 }
  ]),
  productController.updateProduct
);
router.delete('/:id', authenticateJWT, authorizeRoles('admin'), productController.deleteProduct);

module.exports = router;