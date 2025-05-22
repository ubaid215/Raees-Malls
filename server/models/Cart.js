const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const cartSchema = new mongoose.Schema(
  {
    cartId: {
      type: String,
      required: [true, 'Path `cartId` is required'],
      unique: true,
      default: () => `CART-${uuidv4().split('-')[0]}`,
    },
    userId: {
      type: String, // Changed from ObjectId to String to match JWT userId
      required: [true, 'Path `userId` is required'],
      unique: true, // One cart per user
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        variantId: {
          type: mongoose.Schema.Types.ObjectId, // Added to support variants
          ref: 'Product.variants',
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

module.exports = mongoose.model('Cart', cartSchema);