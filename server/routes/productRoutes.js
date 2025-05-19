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
  getProductsForCustomersValidator,
} = require('../validation/productValidators');

// Dynamic upload configuration for images and videos (supports up to 10 variants)
const createUploadFields = (variantCount = 10) => {
  const fields = [
    { name: 'baseImages', maxCount: 5 },
    { name: 'baseVideos', maxCount: 3 }
  ];
  
  for (let i = 0; i < variantCount; i++) {
    fields.push({ name: `variantImages[${i}]`, maxCount: 15 }); // Match your 15 image limit
    fields.push({ name: `variantVideos[${i}]`, maxCount: 3 }); // Match your 3 video limit
  }
  
  return upload.fields(fields);
};

// Public product routes
router.get(
  '/public', 
  getProductsForCustomersValidator, 
  productController.getAllProductsForCustomers
);

router.get(
  '/public/:id', 
  productIdValidator, 
  productController.getProductDetailsForCustomers
);

// Admin product management routes
router.post(
  '/',
  ensureAuthenticated,
  authorizeRoles('admin'),
  createUploadFields(), // Use dynamic upload configuration
  createProductValidator,
  productController.createProduct
);

router.get(
  '/', 
  ensureAuthenticated, 
  authorizeRoles('admin'), 
  getProductsValidator, 
  productController.getAllProducts
);

router.get(
  '/:id', 
  ensureAuthenticated,
  authorizeRoles('admin'),
  productIdValidator,
  productController.getProductById
);

router.put(
  '/:id',
  ensureAuthenticated,
  authorizeRoles('admin'),
  createUploadFields(),
  productIdValidator,
  updateProductValidator,
  productController.updateProduct
);

router.delete(
  '/:id',
  ensureAuthenticated,
  authorizeRoles('admin'),
  productIdValidator,
  productController.deleteProduct
);

module.exports = router;