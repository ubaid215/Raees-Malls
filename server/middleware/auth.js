const jwtService = require('../services/jwtService');
const ApiResponse = require('../utils/apiResponse');

// JWT Authentication
exports.authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;
  // console.log('Token received:', token ? token.substring(0, 10) + '...' : 'No token'); 
  if (!token) {
    return ApiResponse.error(res, 401, 'Authentication required');
  }
  try {
    const decoded = jwtService.verifyAccessToken(token); // Changed from verifyToken
    // console.log('Decoded JWT:', decoded); 
    req.user = decoded; // Adjusted to match JWT payload
    next();
  } catch (err) {
    // console.log('JWT verification error:', err.message); 
    ApiResponse.error(res, 401, 'Invalid or expired token');
  }
};

// Session Authentication (for CMS)
exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  ApiResponse.error(res, 401, 'Please log in to access this resource');
};

// Role-based Access Control
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return ApiResponse.error(res, 403, 
        `Role ${req.user?.role} is not authorized to access this resource`);
    }
    next();
  };
};

// Session Authentication (for CMS)
exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  ApiResponse.error(res, 401, 'Please log in to access this resource');
};

// Role-based Access Control
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return ApiResponse.error(res, 403, 
        `Role ${req.user?.role} is not authorized to access this resource`);
    }
    next();
  };
};