const { validationResult } = require('express-validator');
const passport = require('passport');
const User = require('../models/User');
const Token = require('../models/Token');
const jwtService = require('../services/jwtService');
const authService = require('../services/authServices');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { name, email, password, role = 'user' } = req.body;
    const user = await authService.createUser(name, email, password, role);
    const tokens = jwtService.generateTokens(user);
    
    // Store refresh token
    await Token.create({ userId: user._id, token: tokens.refreshToken });

    // Log the user in automatically to create a session
    req.login(user, (err) => {
      if (err) {
        return next(new ApiError(500, 'Failed to log in user after registration', [err.message]));
      }
      ApiResponse.success(res, 201, 'User registered and logged in successfully', { 
        user: authService.sanitizeUser(user), 
        tokens 
      });
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { email, password } = req.body;

    // Use Passport to authenticate and create a session
    passport.authenticate('local', async (err, user, info) => {
      if (err) return next(err);
      if (!user) return next(new ApiError(401, info.message || 'Invalid credentials'));

      // Log the user in to create a session
      req.login(user, async (err) => {
        if (err) return next(err);

        // Generate JWT tokens
        const tokens = jwtService.generateTokens(user);
        
        // Store refresh token
        await Token.create({ userId: user._id, token: tokens.refreshToken });

        ApiResponse.success(res, 200, 'Logged in successfully', { 
          user: authService.sanitizeUser(user), 
          tokens 
        });
      });
    })(req, res, next);
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

    // Verify and find token
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    const storedToken = await Token.findOne({ 
      token: refreshToken, 
      userId: decoded.userId 
    });

    if (!storedToken) {
      throw new ApiError(403, 'Invalid refresh token');
    }

    // Get user and generate new tokens
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const tokens = jwtService.generateTokens(user);
    
    // Replace old refresh token
    await Token.findOneAndDelete({ token: refreshToken });
    await Token.create({ userId: user._id, token: tokens.refreshToken });

    ApiResponse.success(res, 200, 'Token refreshed successfully', { tokens });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await Token.findOneAndDelete({ token: refreshToken });
    }

    // Destroy the session and clear the cookie
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('connect.sid');
        ApiResponse.success(res, 200, 'Logged out successfully');
      });
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    ApiResponse.success(res, 200, 'User data retrieved', {
      user: authService.sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};