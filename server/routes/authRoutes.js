const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');
const { registerValidator, loginValidator, validate } = require('../validation/authValidators');
const { authLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting
router.use(apiLimiter);

// Public routes with validation and stricter rate limiting
router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);

// Public refresh token route (no JWT auth)
router.post('/refresh-token', authController.refreshToken);

// Protected routes (JWT only)
router.post('/logout', authenticateJWT, authController.logout);
router.get('/me', authenticateJWT, authController.getMe);
router.put('/update-profile', authenticateJWT, authController.updateProfile);

module.exports = router;