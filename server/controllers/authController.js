const { validationResult } = require('express-validator');
const passport = require('passport');
const User = require('../models/User');
const Token = require('../models/Token');
const jwtService = require('../services/jwtService');
const authService = require('../services/authServices');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

exports.register = async (req, res, next) => {
  // console.log('Request headers:', req.headers);
  // console.log('Request body:', req.body);
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
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
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
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
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
    console.log('Refresh token request:', { refreshToken: refreshToken?.slice(0, 10) + '...' });
    if (!refreshToken || refreshToken === 'undefined') {
      throw new ApiError(400, 'Refresh token is required');
    }

    // Verify and find token
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    const storedToken = await Token.findOne({
      token: refreshToken,
      userId: decoded.userId,
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

    ApiResponse.success(res, 200, 'Token refreshed successfully', {
      user: authService.sanitizeUser(user),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error.message);
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await Token.findOneAndDelete({ token: refreshToken });
    }
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      ApiResponse.success(res, 200, 'Logged out successfully');
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

    let userId;
    if (req.user._id) {
      // Session-based: req.user is the full user object
      userId = req.user._id;
    } else if (req.user.userId) {
      // JWT-based: req.user is the decoded JWT payload
      userId = req.user.userId;
    } else {
      throw new ApiError(401, 'Invalid user data');
    }

    const user = await User.findById(userId).select('-password');
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

exports.updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { name, email, addresses } = req.body;
    const userId = req.user.userId || req.user._id.toString();

    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      throw new ApiError(400, 'Email is already in use');
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email, addresses },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      throw new ApiError(404, 'User not found');
    }

    ApiResponse.success(res, 200, 'Profile updated successfully', {
      user: authService.sanitizeUser(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};