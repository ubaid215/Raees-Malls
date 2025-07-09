const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: false
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: false,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  verifiedPurchase: {
    type: Boolean,
    default: false
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  unhelpfulCount: {
    type: Number,
    default: 0
  }
});

// Ensure one review per user per product
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Update product average rating and total reviews after save/delete
reviewSchema.post('save', async function(doc) {
  const Product = mongoose.model('Product');
  const reviews = await this.constructor.find({ productId: doc.productId, isFlagged: false });
  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;
  await Product.findByIdAndUpdate(doc.productId, {
    averageRating: avgRating,
    totalReviews: reviews.length
  });
});

reviewSchema.post('deleteOne', { document: true, query: false }, async function(doc) {
  const Product = mongoose.model('Product');
  const reviews = await this.constructor.find({ productId: doc.productId, isFlagged: false });
  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;
  await Product.findByIdAndUpdate(doc.productId, {
    averageRating: avgRating,
    totalReviews: reviews.length
  });
});

module.exports = mongoose.model('Review', reviewSchema);