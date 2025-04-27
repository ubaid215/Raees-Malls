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

  createUser: async (name, email, password, role = 'user') => {
    if (!validator.isEmail(email)) {
      throw new ApiError(400, 'Invalid email format');
    }
    if (!validator.isLength(password, { min: 8 })) {
      throw new ApiError(400, 'Password must be at least 8 characters');
    }
    if (!['user', 'admin'].includes(role)) {
      throw new ApiError(400, 'Invalid role');
    }
    const user = new User({ name, email, password, role });
    await user.save();
    return user;
  },

  authenticateUser: async (email, password) => {
    if (!validator.isEmail(email)) {
      throw new ApiError(400, 'Invalid email format');
    }
    const user = await User.findOne({ email });
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  },

  sanitizeUser: (user) => {
    const userObj = user.toObject ? user.toObject() : user;
    const { password, __v, ...sanitizedUser } = userObj;
    return sanitizedUser;
  }
};