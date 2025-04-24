const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { ensureAuthenticated, authorizeRoles } = require('../middleware/auth');
const { bannerValidator, bannerIdValidator, getBannersValidator } = require('../validation/bannerValidators');
const upload = require('../middleware/upload');

// Admin routes (under /api/admin/banners)
router.post('/',
  ensureAuthenticated,
  authorizeRoles('admin'),
  upload.single('image'),
  bannerValidator,
  bannerController.uploadBanner
);

router.put('/:bannerId',
  ensureAuthenticated,
  authorizeRoles('admin'),
  upload.single('image'),
  bannerIdValidator,
  bannerValidator,
  bannerController.updateBanner
);

router.delete('/:bannerId',
  ensureAuthenticated,
  authorizeRoles('admin'),
  bannerIdValidator,
  bannerController.deleteBanner
);

router.get('/',
  ensureAuthenticated,
  authorizeRoles('admin'),
  getBannersValidator,
  bannerController.getAllBanners
);

// Public route (under /api/banners)
router.get('/active',
  bannerController.getActiveBanners
);

module.exports = router;