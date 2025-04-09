const express = require('express');
const router = express.Router();
const  upload  = require('../middlewares/multerConfig'); 
const {
  createHeroImage,
  getAllHeroImages,
  updateHeroImage,
  deleteHeroImage,
} = require('../controllers/heroImageController');

// Create a new hero image (single file upload)
router.post('/', upload.single('image'), createHeroImage);

// Get all hero images
router.get('/', getAllHeroImages);

// Update a hero image by ID
router.put('/:id', upload.single('image'), updateHeroImage);

// Delete a hero image by ID
router.delete('/:id', deleteHeroImage);

module.exports = router;