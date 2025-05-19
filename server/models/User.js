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
      return this.provider === 'local'; // Password required only for local auth
    },
    minlength: 8
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values without violating uniqueness
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
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      zip: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving (only for local provider)
userSchema.pre('save', async function(next) {
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