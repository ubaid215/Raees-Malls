const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');
const { registerValidator, loginValidator, validate } = require('../validation/authValidators');
const { authLimiter } = require('../middleware/rateLimiter'); // Only import authLimiter



// Public routes - KEEP authLimiter for security
router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.get('/google', authLimiter, authController.googleAuth);
router.get('/google/callback', authLimiter, authController.googleAuthCallback);

// These don't need rate limiting - they use tokens for security
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticateJWT, authController.logout);
router.get('/me', authenticateJWT, authController.getMe);
router.put('/update-profile', authenticateJWT, authController.updateProfile);

module.exports = router;