const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

// General rate limiter
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  handler: (req, res) => {
    ApiResponse.error(res, 429, 'Too many requests, please try again later');
  }
});

// Strict auth limiter
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  handler: (req, res) => {
    ApiResponse.error(res, 429, 'Too many login attempts, please try again later');
  }
});

// Skip rate limiting for authenticated admin users
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    if (req.user?.role === 'admin') return 1000;
    return 100;
  },
  skip: (req) => {
    // Skip for static assets and health checks
    return /\.(js|css|png|jpg|ico)$/.test(req.path) || 
           ['/health', '/api/health'].includes(req.path);
  }
});