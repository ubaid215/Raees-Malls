const passport = require('passport');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const authService = require('../services/authServices');
const jwtService = require('../services/jwtService');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Token = require('../models/Token');

exports.login = (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    try {
      if (err) throw new ApiError(500, 'Authentication error', err);
      if (!user) throw new ApiError(401, info.message || 'Invalid credentials');
      if (user.role !== 'admin') throw new ApiError(403, 'User is not an admin');

      req.logIn(user, async (err) => {
        if (err) throw new ApiError(500, 'Session error', err);

        const { accessToken, refreshToken } = jwtService.generateTokens({
          userId: user._id.toString(),
          role: user.role
        });

        await Token.findOneAndDelete({ userId: user._id });
        await Token.create({ userId: user._id, token: refreshToken });

        await AuditLog.create({
          userId: user._id,
          action: 'ADMIN_LOGIN',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });

        res.cookie('adminToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 15 * 60 * 1000 // 15 minutes
        });
        res.cookie('adminRefreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        ApiResponse.success(res, 200, 'Logged in successfully', {
          user: authService.sanitizeUser(user),
          token: accessToken, // Return in body
          refreshToken: refreshToken // Return in body
        });
      });
    } catch (error) {
      next(error);
    }
  })(req, res, next);
};

exports.logout = async (req, res, next) => {
  try {
    if (!req.user) throw new ApiError(401, 'Not authenticated');

    console.log('Admin logout:', req.user.email || req.user.userId);
    await Token.findOneAndDelete({ userId: req.user.userId });

    await AuditLog.create({
      userId: req.user.userId,
      action: 'ADMIN_LOGOUT',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Clear session if it exists
    if (req.session) {
      req.logout(() => {
        req.session.destroy();
      });
    }

    ApiResponse.success(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

exports.getSessionUser = async (req, res, next) => {
  try {
    if (!req.user) throw new ApiError(401, 'Not authenticated');

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role !== 'admin') {
      console.log('Session user not an admin:', user.email, 'Role:', user.role);
      throw new ApiError(403, 'Access restricted');
    }

    console.log('Session user retrieved:', user.email);
    ApiResponse.success(res, 200, 'Session user', authService.sanitizeUser(user));
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    if (!req.user) throw new ApiError(401, 'Not authenticated');

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new ApiError(400, 'Current password, new password, and confirm password are required');
    }

    if (newPassword !== confirmPassword) {
      throw new ApiError(400, 'New password and confirm password do not match');
    }

    const user = await User.findById(req.user.userId);
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role !== 'admin') {
      console.log('Change password attempt: User not an admin:', user.email, 'Role:', user.role);
      throw new ApiError(403, 'Access restricted to admins');
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

exports.verifyToken = async (req, res, next) => {
  try {
    if (!req.user) throw new ApiError(401, 'Not authenticated');

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role !== 'admin') {
      console.log('Token verification: User not an admin:', user.email, 'Role:', user.role);
      throw new ApiError(403, 'Access restricted to admins');
    }

    console.log('Token verified for admin:', user.email);

    await AuditLog.create({
      userId: user._id,
      action: 'ADMIN_TOKEN_VERIFY',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    ApiResponse.success(res, 200, 'Token is valid', {
      user: authService.sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.adminRefreshToken;
    if (!refreshToken) throw new ApiError(400, 'Refresh token is required');

    const decoded = jwtService.verifyRefreshToken(refreshToken);
    const storedToken = await Token.findOne({
      token: refreshToken,
      userId: decoded.userId,
    });
    if (!storedToken) throw new ApiError(403, 'Refresh token not found or expired');

    const user = await User.findById(decoded.userId).select('-password');
    if (!user || user.role !== 'admin') throw new ApiError(403, 'User is not an admin');

    const { accessToken, refreshToken: newRefreshToken } = jwtService.generateTokens({
      userId: user._id.toString(),
      role: user.role
    });

    await Token.findOneAndDelete({ token: refreshToken });
    await Token.create({ userId: user._id, token: newRefreshToken });

    await AuditLog.create({
      userId: user._id,
      action: 'ADMIN_TOKEN_REFRESH',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.cookie('adminToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000
    });
    res.cookie('adminRefreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    ApiResponse.success(res, 200, 'Token refreshed successfully', {
      user: authService.sanitizeUser(user),
      token: accessToken, // Return in body
      refreshToken: newRefreshToken // Return in body
    });
  } catch (error) {
    next(error);
  }
};