const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

// Strict authentication limiter - security critical
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Allow max 5 failed attempts in 15 min
  skipSuccessfulRequests: true, // Successful logins don’t count
  skipFailedRequests: false,    // Failed attempts DO count
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ApiResponse.error(res, 429, 'Too many login attempts. Please try again in 15 minutes.');
  }
});

// Very strict for password reset / sensitive operations
exports.sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Allow max 3 attempts per hour
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ApiResponse.error(res, 429, 'Too many attempts for this operation. Please try again in 1 hour.');
  }
});
