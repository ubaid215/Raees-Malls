const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { loginValidator, changePasswordValidator } = require('../validation/authValidators');
const { authLimiter } = require('../middleware/rateLimiter');

// Admin authentication routes
router.post('/login',
  authLimiter,
  loginValidator,
  adminAuthController.login
);

router.post('/logout',
  authenticateJWT, // Use JWT for stateless logout
  authorizeRoles('admin'),
  adminAuthController.logout
);

router.get('/session',
  // Keep session-based auth for CMS compatibility
  (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    return authenticateJWT(req, res, next); // Fallback to JWT
  },
  authorizeRoles('admin'),
  adminAuthController.getSessionUser
);

router.post('/change-password',
  authenticateJWT,
  authorizeRoles('admin'),
  changePasswordValidator,
  adminAuthController.changePassword
);

router.get('/verify-token',
  authenticateJWT,
  authorizeRoles('admin'),
  adminAuthController.verifyToken
);

router.post('/refresh-token',
  adminAuthController.refreshToken // No JWT/auth check here, as it validates the refresh token
);

// Protected admin routes
router.get('/dashboard',
  authenticateJWT,
  authorizeRoles('admin'),
  (req, res) => {
    const ApiResponse = require('../utils/apiResponse');
    ApiResponse.success(res, 200, 'Admin dashboard accessed', {
      user: req.user,
      dashboardData: {} // Add actual dashboard data here
    });
  }
);

module.exports = router;