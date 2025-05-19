const User = require('../models/User');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const ApiError = require('../utils/apiError');

module.exports = {
  checkExistingUser: async (email) => {
    if (!validator.isEmail(email)) {
      throw new ApiError(400, 'Invalid email format');
    }
    return await User.findOne({ email });
  },

  createUser: async (name, email, password, role = 'user', provider = 'local', googleId = null) => {
    if (!validator.isEmail(email)) {
      throw new ApiError(400, 'Invalid email format');
    }
    if (provider === 'local' && (!password || !validator.isLength(password, { min: 8 }))) {
      throw new ApiError(400, 'Password must be at least 8 characters');
    }
    if (!['user', 'admin'].includes(role)) {
      throw new ApiError(400, 'Invalid role');
    }

    const userData = {
      name,
      email,
      role,
      provider,
    };

    if (provider === 'local') {
      userData.password = password;
    } else if (provider === 'google') {
      userData.googleId = googleId;
      userData.isVerified = true;
    }

    try {
      const user = await User.create(userData);
      return user;
    } catch (error) {
      if (error.code === 11000) {
        throw new ApiError(400, 'Email or Google ID already in use');
      }
      throw new ApiError(500, 'Failed to create user', [error.message]);
    }
  },

  authenticateUser: async (email, password) => {
    if (!validator.isEmail(email)) {
      throw new ApiError(400, 'Invalid email format');
    }
    const user = await User.findOne({ email });
    if (!user || user.provider !== 'local') return null;

    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  },

  sanitizeUser: (user) => {
    const userObj = user.toObject ? user.toObject() : user;
    const { password, __v, ...sanitizedUser } = userObj;
    return sanitizedUser;
  },
};