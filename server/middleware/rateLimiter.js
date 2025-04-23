const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

// General rate limiter
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  handler: (req, res) => {
    ApiResponse.error(res, 429, 'Too many requests, please try again later');
  }
});

// Strict auth limiter
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  handler: (req, res) => {
    ApiResponse.error(res, 429, 'Too many login attempts, please try again later');
  }
});