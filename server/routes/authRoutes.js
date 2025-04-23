const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../validation/authValidators');
const { authLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting
router.use(apiLimiter);

// Public routes with validation and stricter rate limiting
router.post('/register', authLimiter, registerValidator, authController.register);
router.post('/login', authLimiter, loginValidator, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticateJWT, authController.getMe);

module.exports = router;