const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { bannerValidator, bannerIdValidator, getBannersValidator } = require('../validation/bannerValidators');
const upload = require('../middleware/upload');

// Admin routes (under /api/admin/banners)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('admin'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'videos', maxCount: 5 } // Allow up to 5 videos
  ], 'banners'),
  bannerValidator,
  bannerController.uploadBanner
);

router.put(
  '/:bannerId',
  authenticateJWT,
  authorizeRoles('admin'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'videos', maxCount: 5 } // Allow up to 5 videos
  ], 'banners'),
  bannerIdValidator,
  bannerValidator,
  bannerController.updateBanner
);

router.delete(
  '/:bannerId',
  authenticateJWT,
  authorizeRoles('admin'),
  bannerIdValidator,
  bannerController.deleteBanner
);

router.get(
  '/',
  authenticateJWT,
  authorizeRoles('admin'),
  getBannersValidator,
  bannerController.getAllBanners
);

// Public route (under /api/banners)
router.get('/active', bannerController.getActiveBanners);

module.exports = router;