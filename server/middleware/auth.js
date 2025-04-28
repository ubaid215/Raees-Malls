const jwtService = require('../services/jwtService');
const ApiResponse = require('../utils/apiResponse');

// JWT Authentication
exports.authenticateJWT = (req, res, next) => {
  if (req.isAuthenticated()) return next(); 
  
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;
  if (!token) return ApiResponse.error(res, 401, 'Authentication required');

  try {
    const decoded = jwtService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
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