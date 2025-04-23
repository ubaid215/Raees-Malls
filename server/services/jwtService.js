const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/apiError');

module.exports = {
  generateTokens: (user) => {
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      config.JWT_ACCESS_SECRET,
      { expiresIn: config.JWT_ACCESS_EXPIRATION }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id },
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRATION }
    );
    
    return { accessToken, refreshToken };
  },

  verifyAccessToken: (token) => {
    try {
      return jwt.verify(token, config.JWT_ACCESS_SECRET);
    } catch (err) {
      throw new ApiError(401, 'Invalid access token');
    }
  },

  verifyRefreshToken: (token) => {
    try {
      return jwt.verify(token, config.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new ApiError(401, 'Invalid refresh token');
    }
  }
};