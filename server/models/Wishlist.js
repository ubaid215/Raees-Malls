const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wishlistSchema = new Schema({
  deviceId: {
    type: String,
    index: true
  },
  items: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required']
    },
    variantId: {
      type: Schema.Types.ObjectId,
      required: false
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
wishlistSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure unique product/variant per device
wishlistSchema.index({ deviceId: 1, 'items.productId': 1, 'items.variantId': 1 }, { unique: true, partialFilterExpression: { deviceId: { $exists: true } } });

module.exports = mongoose.model('Wishlist', wishlistSchema);