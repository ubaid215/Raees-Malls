const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return this.provider === 'local';
    },
    minlength: 8
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  addresses: [
    {
      fullName: { type: String, required: true, trim: true },
      addressLine1: { type: String, required: true, trim: true }, // Changed from 'street'
      addressLine2: { type: String, trim: true }, // Optional second line
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true }, // Changed from 'zip'
      country: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      isDefault: { type: Boolean, default: false }
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure only one address is marked as default
userSchema.pre('save', async function(next) {
  if (this.isModified('addresses')) {
    const defaultAddresses = this.addresses.filter(addr => addr.isDefault);
    if (defaultAddresses.length > 1) {
      // Keep the last one as default, unset others
      defaultAddresses.slice(0, -1).forEach(addr => (addr.isDefault = false));
    }
  }
  if (!this.isModified('password') || this.provider !== 'local') return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare passwords (only for local provider)
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.provider !== 'local') return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);