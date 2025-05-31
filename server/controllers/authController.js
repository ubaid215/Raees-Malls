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
    const user = await authService.createUser(name, email, password, role, 'local');
    const tokens = jwtService.generateTokens(user);

    // Store refresh token in database
    await Token.create({ userId: user._id, token: tokens.refreshToken });

    // Set cookies AND return tokens
    res.cookie('userToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    res.cookie('userRefreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Log the user in for session-based auth (for local only)
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

    passport.authenticate('local', async (err, user, info) => {
      if (err) return next(err);
      if (!user) return next(new ApiError(401, info.message || 'Invalid credentials'));

      req.login(user, async (err) => {
        if (err) return next(err);

        const tokens = jwtService.generateTokens(user);
        await Token.create({ userId: user._id, token: tokens.refreshToken });

        // Set cookies AND return tokens
        res.cookie('userToken', tokens.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000 // 15 minutes
        });
        res.cookie('userRefreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

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

exports.googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false, // Disable session for Google auth
});

exports.googleAuthCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err) return next(new ApiError(500, 'Google authentication error', [err.message]));
    if (!user) return next(new ApiError(401, info?.message || 'Google authentication failed'));

    try {
      const tokens = jwtService.generateTokens(user);
      await Token.create({ userId: user._id, token: tokens.refreshToken });

      // Set cookies for Google auth as well
      res.cookie('userToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
      });
      res.cookie('userRefreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      const frontendUrl = process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_PROD_URL
        : process.env.FRONTEND_DEV_URL;

      const frontendCallbackUrl = `${frontendUrl}/callback?token=${encodeURIComponent(
        tokens.accessToken
      )}&refreshToken=${encodeURIComponent(tokens.refreshToken)}&userId=${user._id.toString()}`;

      // console.log('Redirecting to:', frontendCallbackUrl); 
      res.redirect(frontendCallbackUrl);
    } catch (error) {
      next(new ApiError(500, 'Error processing Google auth callback', [error.message]));
    }
  })(req, res, next);
};

exports.refreshToken = async (req, res, next) => {
  try {
    // Check both request body and cookies for refresh token
    const refreshToken = req.body.refreshToken || req.cookies.userRefreshToken;
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new ApiError(400, 'Valid refresh token is required');
    }

    const decoded = jwtService.verifyRefreshToken(refreshToken);
    const storedToken = await Token.findOne({
      token: refreshToken,
      userId: decoded.userId,
    });

    if (!storedToken) {
      throw new ApiError(403, 'Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const tokens = jwtService.generateTokens(user);
    
    // Remove old refresh token and add new one
    await Token.findOneAndDelete({ token: refreshToken });
    await Token.create({ userId: user._id, token: tokens.refreshToken });

    // Update cookies with new tokens
    res.cookie('userToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });
    res.cookie('userRefreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

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
    // Get refresh token from body or cookies
    const refreshToken = req.body.refreshToken || req.cookies.userRefreshToken;
    
    if (refreshToken) {
      await Token.findOneAndDelete({ token: refreshToken });
    }

    // Clear cookies
    res.clearCookie('userToken');
    res.clearCookie('userRefreshToken');

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

    let userId = req.user.userId || req.user._id?.toString();
    if (!userId) {
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
    const userId = req.user.userId || req.user._id?.toString();

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