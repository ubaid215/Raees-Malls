const passport = require('passport');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const authService = require('../services/authServices');
const jwtService = require('../services/jwtService');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

exports.login = (req, res, next) => {
  console.log('Admin login attempt:', req.body.email);
  passport.authenticate('local', async (err, user, info) => {
    try {
      console.log('Passport auth result:', { err, user: user ? user.email : null, info });
      if (err) throw new ApiError(500, 'Authentication error', err);
      if (!user) throw new ApiError(401, info.message || 'Invalid credentials');

      if (user.role !== 'admin') {
        console.log('User not an admin:', user.email, 'Role:', user.role);
        throw new ApiError(403, 'User is not an admin');
      }

      req.logIn(user, async (err) => {
        if (err) throw new ApiError(500, 'Session error', err);
        
        await AuditLog.create({
          userId: user._id,
          action: 'ADMIN_LOGIN',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });

        const { accessToken, refreshToken } = jwtService.generateTokens({
          id: user._id,
          role: user.role
        });

        console.log('Admin logged in:', user.email);
        ApiResponse.success(res, 200, 'Logged in successfully', {
          user: authService.sanitizeUser(user),
          token: accessToken,
          refreshToken: refreshToken
        });
      });
    } catch (error) {
      next(error);
    }
  })(req, res, next);
};

exports.logout = async (req, res) => {
  try {
    if (req.user) {
      console.log('Admin logout:', req.user.email);
      await AuditLog.create({
        userId: req.user._id,
        action: 'ADMIN_LOGOUT',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    req.logout(() => {
      req.session.destroy();
      ApiResponse.success(res, 200, 'Logged out successfully');
    });
  } catch (error) {
    ApiResponse.error(res, 500, 'Logout failed', error);
  }
};

exports.getSessionUser = (req, res) => {
  if (!req.isAuthenticated()) {
    console.log('Session not authenticated');
    return ApiResponse.error(res, 401, 'Not authenticated');
  }
  
  if (req.user.role !== 'admin') {
    console.log('Session user not an admin:', req.user.email, 'Role:', req.user.role);
    return ApiResponse.error(res, 403, 'Access restricted');
  }

  console.log('Session user retrieved:', req.user.email);
  ApiResponse.success(res, 200, 'Session Blondie-style user', authService.sanitizeUser(req.user));
};

exports.changePassword = async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      console.log('Change password attempt: Not authenticated');
      throw new ApiError(401, 'Not authenticated');
    }

    if (req.user.role !== 'admin') {
      console.log('Change password attempt: User not an admin:', req.user.email, 'Role:', req.user.role);
      throw new ApiError(403, 'Access restricted to admins');
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new ApiError(400, 'Current password, new password, and confirm password are required');
    }

    if (newPassword !== confirmPassword) {
      throw new ApiError(400, 'New password and confirm password do not match');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      console.log('Change password failed: Incorrect current password for:', user.email);
      throw new ApiError(401, 'Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: 'ADMIN_PASSWORD_CHANGE',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    console.log('Password changed successfully for:', user.email);
    ApiResponse.success(res, 200, 'Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error.message);
    next(error);
  }
};

exports.verifyToken = (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      console.log('Token verification: Not authenticated');
      throw new ApiError(401, 'Not authenticated');
    }
    
    if (req.user.role !== 'admin') {
      console.log('Token verification: User not an admin:', req.user.email, 'Role:', req.user.role);
      throw new ApiError(403, 'Access restricted to admins');
    }

    console.log('Token verified for admin:', req.user.email);
    
    AuditLog.create({
      userId: req.user._id,
      action: 'ADMIN_TOKEN_VERIFY',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('Failed to log token verification:', err));

    ApiResponse.success(res, 200, 'Token is valid', {
      user: authService.sanitizeUser(req.user)
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required');
    }

    // Verify refresh token
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'admin') {
      console.log('Token refresh: Invalid user or not an admin:', decoded.userId);
      throw new ApiError(403, 'Invalid refresh token or unauthorized');
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = jwtService.generateTokens({
      id: user._id,
      role: user.role
    });

    // Log refresh action
    await AuditLog.create({
      userId: user._id,
      action: 'ADMIN_TOKEN_REFRESH',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    console.log('Token refreshed for admin:', user.email);
    
    ApiResponse.success(res, 200, 'Token refreshed successfully', {
      user: authService.sanitizeUser(user),
      token: accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error.message);
    next(error);
  }
};