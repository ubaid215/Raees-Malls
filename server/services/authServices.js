const User = require('../models/User');
const bcrypt = require('bcryptjs');

module.exports = {
  checkExistingUser: async (email) => {
    return await User.findOne({ email });
  },

  createUser: async (name, email, password, role) => {
    const user = new User({ name, email, password, role });
    await user.save();
    return user;
  },

  authenticateUser: async (email, password) => {
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