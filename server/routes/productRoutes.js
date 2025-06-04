const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// Public routes for customers
router.get('/public', productController.getAllProductsForCustomers);
router.get('/public/:id', productController.getProductDetailsForCustomers);
router.get('/public/featured', productController.getFeaturedProducts);

// Admin routes - FIXED: Properly pass next parameter
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
  // FIXED: Pass next parameter to controller
  productController.createProduct
);

// Admin route to get all products - FIXED
router.get('/', 
  authenticateJWT, 
  authorizeRoles('admin'), 
  productController.getAllProducts
);

// Admin route to get a single product by ID - FIXED
router.get('/:id', 
  authenticateJWT, 
  authorizeRoles('admin'), 
  productController.getProductById
);

// Admin route to update a product - FIXED
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
  // FIXED: If you need validation, do it like this:
  (req, res, next) => {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    // Call the controller with all three parameters
    productController.updateProduct(req, res, next);
  }
);

// Admin route to delete a product - FIXED
router.delete('/:id', 
  authenticateJWT, 
  authorizeRoles('admin'), 
  productController.deleteProduct
);

module.exports = router;