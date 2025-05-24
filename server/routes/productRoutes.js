const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// Public routes for customers
router.get('/public', productController.getAllProductsForCustomers);
router.get('/public/:id', productController.getProductDetailsForCustomers);
router.get('/public/featured', productController.getFeaturedProducts);

// Admin routes with improved error handling
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('admin'),
  upload.fields([
    { name: 'baseImages', maxCount: 10 }, // Allow up to 10 base images
    { name: 'baseVideos', maxCount: 5 },  // Allow up to 5 base videos
    { name: 'variantImages[0]', maxCount: 10 }, // Allow up to 10 images for variant 0
    { name: 'variantImages[1]', maxCount: 10 }, // Allow up to 10 images for variant 1
    { name: 'variantImages[2]', maxCount: 10 }, // Allow up to 10 images for variant 2
    { name: 'variantVideos[0]', maxCount: 5 },  // Allow up to 5 videos for variant 0
    { name: 'variantVideos[1]', maxCount: 5 },  // Allow up to 5 videos for variant 1
    { name: 'variantVideos[2]', maxCount: 5 }   // Allow up to 5 videos for variant 2
  ]),
  async (req, res, next) => {
    try {
      await productController.createProduct(req, res);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: error.message || 'Failed to create product' });
    }
  }
);

// Admin route to get all products
router.get('/', authenticateJWT, authorizeRoles('admin'), async (req, res, next) => {
  try {
    await productController.getAllProducts(req, res);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch products' });
  }
});

// Admin route to get a single product by ID
router.get('/:id', authenticateJWT, authorizeRoles('admin'), async (req, res, next) => {
  try {
    await productController.getProductById(req, res);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch product' });
  }
});

// Admin route to update a product
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  upload.fields([
    { name: 'baseImages', maxCount: 10 }, // Allow up to 10 base images
    { name: 'baseVideos', maxCount: 5 },  // Allow up to 5 base videos
    { name: 'variantImages[0]', maxCount: 10 }, // Allow up to 10 images for variant 0
    { name: 'variantImages[1]', maxCount: 10 }, // Allow up to 10 images for variant 1
    { name: 'variantImages[2]', maxCount: 10 }, // Allow up to 10 images for variant 2
    { name: 'variantVideos[0]', maxCount: 5 },  // Allow up to 5 videos for variant 0
    { name: 'variantVideos[1]', maxCount: 5 },  // Allow up to 5 videos for variant 1
    { name: 'variantVideos[2]', maxCount: 5 }   // Allow up to 5 videos for variant 2
  ]),
  async (req, res, next) => {
    try {
      // Validate product ID
      const { id } = req.params;
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }
      await productController.updateProduct(req, res);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: error.message || 'Failed to update product' });
    }
  }
);

// Admin route to delete a product
router.delete('/:id', authenticateJWT, authorizeRoles('admin'), async (req, res, next) => {
  try {
    await productController.deleteProduct(req, res);
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message || 'Failed to delete product' });
  }
});

module.exports = router;