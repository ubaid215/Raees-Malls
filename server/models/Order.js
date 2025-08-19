const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantType: {
    type: String,
    enum: ['simple', 'color', 'storage', 'size'],
    required: true
  },
  // For simple products (no variants)
  simpleProduct: {
    price: {
      type: Number,
      min: 0
    },
    discountPrice: {
      type: Number,
      min: 0
    },
    quantity: {
      type: Number,
      min: 1
    },
    sku: String
  },
  // For color variants
  colorVariant: {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: 'Product.variants'
    },
    color: {
      name: String
    },
    price: {
      type: Number,
      min: 0
    },
    discountPrice: {
      type: Number,
      min: 0
    },
    quantity: {
      type: Number,
      min: 1
    },
    sku: String
  },
  // For tech products with storage options
  storageVariant: {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: 'Product.variants'
    },
    color: {
      name: String
    },
    storageOption: {
      capacity: String,
      price: {
        type: Number,
        min: 0
      },
      discountPrice: {
        type: Number,
        min: 0
      },
      sku: String
    },
    quantity: {
      type: Number,
      min: 1
    }
  },
  // For apparel with size options
  sizeVariant: {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: 'Product.variants'
    },
    color: {
      name: String
    },
    sizeOption: {
      size: String,
      price: {
        type: Number,
        min: 0
      },
      discountPrice: {
        type: Number,
        min: 0
      },
      sku: String
    },
    quantity: {
      type: Number,
      min: 1
    }
  },
  // Common fields for all item types
  itemName: {
    type: String,
    required: true
  },
  itemImage: {
    url: String,
    alt: String
  }
}, { _id: false });

const orderSchema = new Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  totalShippingCost: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  discountId: {
    type: Schema.Types.ObjectId,
    ref: 'Discount'
  },
  discountAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  // Modified payment fields
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'bank_transfer', 'cash_on_delivery', 'other'],
    default: 'cash_on_delivery'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  shippingAddress: {
    fullName: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true }
  },
  billingAddress: {
    sameAsShipping: { type: Boolean, default: true },
    fullName: { type: String },
    addressLine1: { type: String },
    addressLine2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String }
  },
  trackingInfo: {
    carrier: String,
    trackingNumber: String,
    trackingUrl: String
  },
  notes: {
    customer: String,
    admin: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Validation to ensure each item has the proper structure based on variantType
orderItemSchema.pre('validate', function(next) {
  const variantType = this.variantType;
  
  switch(variantType) {
    case 'simple':
      if (!this.simpleProduct || !this.simpleProduct.price || !this.simpleProduct.quantity) {
        return next(new Error('Simple products require price and quantity'));
      }
      break;
      
    case 'color':
      if (!this.colorVariant || !this.colorVariant.price || !this.colorVariant.quantity) {
        return next(new Error('Color variants require price and quantity'));
      }
      break;
      
    case 'storage':
      if (!this.storageVariant || !this.storageVariant.storageOption || 
          !this.storageVariant.storageOption.price || !this.storageVariant.quantity) {
        return next(new Error('Storage variants require storage option details and quantity'));
      }
      break;
      
    case 'size':
      if (!this.sizeVariant || !this.sizeVariant.sizeOption || 
          !this.sizeVariant.sizeOption.price || !this.sizeVariant.quantity) {
        return next(new Error('Size variants require size option details and quantity'));
      }
      break;
      
    default:
      return next(new Error('Invalid variant type'));
  }
  
  next();
});

// Update timestamps on save
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set default payment method to COD if not specified
  if (!this.paymentMethod) {
    this.paymentMethod = 'cash_on_delivery';
  }
  
  next();
});

// Calculate totals before saving
orderSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce((total, item) => {
    let itemPrice = 0;
    let itemQuantity = 0;
    
    switch(item.variantType) {
      case 'simple':
        itemPrice = item.simpleProduct.discountPrice || item.simpleProduct.price;
        itemQuantity = item.simpleProduct.quantity;
        break;
      case 'color':
        itemPrice = item.colorVariant.discountPrice || item.colorVariant.price;
        itemQuantity = item.colorVariant.quantity;
        break;
      case 'storage':
        itemPrice = item.storageVariant.storageOption.discountPrice || 
                   item.storageVariant.storageOption.price;
        itemQuantity = item.storageVariant.quantity;
        break;
      case 'size':
        itemPrice = item.sizeVariant.sizeOption.discountPrice || 
                   item.sizeVariant.sizeOption.price;
        itemQuantity = item.sizeVariant.quantity;
        break;
    }
    
    return total + (itemPrice * itemQuantity);
  }, 0);
  
  this.totalAmount = this.subtotal + this.totalShippingCost - this.discountAmount;
  
  next();
});

module.exports = mongoose.model('Order', orderSchema);