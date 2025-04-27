const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const discountSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true, // Keep this for unique index
    trim: true,
    match: /^[A-Z0-9-]+$/i
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed']
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  applicableTo: {
    type: String,
    required: true,
    enum: ['all', 'products', 'categories', 'orders']
  },
  productIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  categoryIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Category'
  }],
  minOrderAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Remove this to avoid duplicate index
// discountSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model('Discount', discountSchema);