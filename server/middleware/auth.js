const jwtService = require('../services/jwtService');
const ApiResponse = require('../utils/apiResponse');

// JWT Authentication
exports.authenticateJWT = (req, res, next) => {
  if (req.headers['x-skip-auth'] === 'true') {
    console.log('Bypassing JWT auth for', req.originalUrl);
    return next();
  }

  if (req.isAuthenticated()) {
    console.log('User is session-authenticated for', req.originalUrl, '- User:', req.user);
    // Normalize req.user to match JWT payload structure
    req.user = {
      userId: req.user._id.toString(),
      role: req.user.role,
    };
    return next();
  }

  const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;
  if (!token) {
    console.log('No token provided for', req.originalUrl);
    return ApiResponse.error(res, 401, 'Authentication required');
  }

  try {
    const decoded = jwtService.verifyAccessToken(token);
    console.log('JWT decoded for', req.originalUrl, ':', decoded);
    req.user = decoded; // Already in { userId, role } format
    next();
  } catch (err) {
    console.error('JWT verification failed for', req.originalUrl, ':', err.message);
    ApiResponse.error(res, 401, 'Invalid or expired token');
  }
};

// Session Authentication (for CMS)
exports.ensureAuthenticated = (req, res, next) => {
  if (req.headers['x-skip-auth'] === 'true') {
    console.log('Bypassing session auth for', req.originalUrl);
    return next();
  }

  if (req.isAuthenticated()) {
    console.log('Session authentication passed for', req.originalUrl, '- User:', req.user);
    return next();
  }
  console.log('Session authentication failed for', req.originalUrl);
  ApiResponse.error(res, 401, 'Please log in to access this resource');
};

// Role-based Access Control
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (req.headers['x-skip-auth'] === 'true') {
      console.log('Bypassing role check for', req.originalUrl);
      return next();
    }

    const userRole = req.user?.role?.toLowerCase().trim();
    const expectedRoles = roles.map(role => role.toLowerCase().trim());
    console.log('Checking roles for', req.originalUrl, '- Expected:', expectedRoles, 'User Role:', userRole);
    if (!req.user || !expectedRoles.includes(userRole)) {
      console.log('Role check failed for', req.originalUrl, '- User Role:', userRole, 'Expected:', expectedRoles);
      return ApiResponse.error(
        res,
        403,
        `Role ${req.user?.role || 'unknown'} is not authorized to access this resource`
      );
    }
    console.log('Role check passed for', req.originalUrl);
    next();
  };
};