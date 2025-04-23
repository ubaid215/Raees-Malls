const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { ensureAuthenticated, authorizeRoles } = require('../middleware/auth');
const { loginValidator, changePasswordValidator } = require('../validation/authValidators');
const { authLimiter } = require('../middleware/rateLimiter');

// Admin authentication routes
router.post('/login', 
  authLimiter, // Stricter rate limiting for admin login
  loginValidator,
  adminAuthController.login
);

router.post('/logout', 
  ensureAuthenticated,
  authorizeRoles('admin'),
  adminAuthController.logout
);

router.get('/session', 
  ensureAuthenticated,
  authorizeRoles('admin'),
  adminAuthController.getSessionUser
);

router.post('/change-password',
  ensureAuthenticated,
  authorizeRoles('admin'),
  changePasswordValidator,
  adminAuthController.changePassword
);

// Protected admin routes
router.get('/dashboard', 
  ensureAuthenticated, 
  authorizeRoles('admin'),
  (req, res) => {
    ApiResponse.success(res, 200, 'Admin dashboard accessed', {
      user: req.user,
      dashboardData: {} // Add actual dashboard data here
    });
  }
);

module.exports = router;