const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multerConfig');
const {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

// Placeholder auth middleware
const auth = (req, res, next) => next();

router.route('/')
  .get(getAllProducts)
  .post(auth, upload.array('images', 5), createProduct);

router.route('/:id')
  .get(getProduct)
  .put(auth, upload.array('images', 5), updateProduct)
  .delete(auth, deleteProduct);

module.exports = router;