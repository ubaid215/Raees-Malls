const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wishlistSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  items: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required']
    },
    variantId: {
      type: Schema.Types.ObjectId, // References _id of a variant in Product.variants
      required: false // Optional, for variant-specific wishlists
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

// Ensure unique product/variant per user
wishlistSchema.index({ userId: 1, 'items.productId': 1, 'items.variantId': 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);