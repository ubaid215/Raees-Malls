const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { loginValidator, changePasswordValidator } = require('../validation/authValidators');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login',
  authLimiter, // KEEP this - prevents brute force
  loginValidator,
  adminAuthController.login
);

// These routes are protected by JWT/auth - don't need rate limiting
router.post('/logout',
  authenticateJWT,
  authorizeRoles('admin'),
  adminAuthController.logout
);

router.get('/session',
  (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    return authenticateJWT(req, res, next);
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
  adminAuthController.refreshToken
);

router.get('/dashboard',
  authenticateJWT,
  authorizeRoles('admin'),
  (req, res) => {
    const ApiResponse = require('../utils/apiResponse');
    ApiResponse.success(res, 200, 'Admin dashboard accessed', {
      user: req.user,
      dashboardData: {}
    });
  }
);

module.exports = router;