const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multerConfig');
const {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

router.post('/', upload.single('image'), createCategory);
router.get('/', getAllCategories);
router.put('/:id', upload.single('image'), updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;