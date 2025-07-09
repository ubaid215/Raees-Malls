const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
  },
  // For products with variants
  variantColor: {
    type: String,
    trim: true,
    maxlength: [50, 'Variant color name cannot exceed 50 characters'],
  },
  // For storage options within variants
  storageCapacity: {
    type: String,
    trim: true,
  },
  // For size options within variants
  size: {
    type: String,
    trim: true,
    uppercase: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
  },
  // Store the SKU for easy identification and inventory tracking
  sku: {
    type: String,
    trim: true,
    uppercase: true,
  },
  // Store price at time of adding to cart (for price consistency)
  priceAtAdd: {
    type: Number,
    min: [0, 'Price cannot be negative'],
  },
  discountPriceAtAdd: {
    type: Number,
    min: [0, 'Discount price cannot be negative'],
  },
}, { _id: false });

// Validation to ensure proper item configuration
cartItemSchema.pre('validate', function(next) {
  // If variantColor is provided, it means this is a variant-based item
  if (this.variantColor) {
    // For variant items, we need either storage or size, but not both
    if (this.storageCapacity && this.size) {
      return next(new Error('Cart item cannot have both storage capacity and size'));
    }
  }
  
  next();
});

const cartSchema = new mongoose.Schema(
  {
    cartId: {
      type: String,
      required: [true, 'Cart ID is required'],
      unique: true,
      default: () => `CART-${uuidv4().split('-')[0]}`,
    },
    userId: {
      type: String, // String to match JWT userId
      required: [true, 'User ID is required'],
      unique: true, // One cart per user
      index: true, // Index for faster queries
    },
    items: [cartItemSchema],
    // Optional: Store total for quick access (can be calculated on-demand)
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
    // Optional: Store item count for quick access
    totalItems: {
      type: Number,
      default: 0,
      min: [0, 'Total items cannot be negative'],
    },
  },
  { 
    timestamps: true,
    // Add methods to the schema
    methods: {
      // Method to find a specific item in the cart
      findItem: function(productId, variantColor = null, storageCapacity = null, size = null) {
        return this.items.find(item => {
          return item.productId.toString() === productId.toString() &&
                 item.variantColor === variantColor &&
                 item.storageCapacity === storageCapacity &&
                 item.size === size;
        });
      },
      
      // Method to calculate total amount
      calculateTotal: function() {
        return this.items.reduce((total, item) => {
          const itemPrice = item.discountPriceAtAdd || item.priceAtAdd || 0;
          return total + (itemPrice * item.quantity);
        }, 0);
      },
      
      // Method to calculate total items
      calculateItemCount: function() {
        return this.items.reduce((count, item) => count + item.quantity, 0);
      }
    }
  }
);

// Pre-save middleware to update totals
cartSchema.pre('save', function(next) {
  this.totalAmount = this.calculateTotal();
  this.totalItems = this.calculateItemCount();
  next();
});



module.exports = mongoose.model('Cart', cartSchema);