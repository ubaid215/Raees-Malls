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
  // Payment fields with Alfa Payment Gateway integration - UPDATED
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'alfa_wallet', 'alfalah_bank', 'cash_on_delivery'],
    default: 'cash_on_delivery'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'not_required'],
    default: 'pending'
  },
  // Alfa Payment Gateway Integration Fields - UPDATED for Page Redirection
  alfaPayment: {
    transactionId: {
      type: String,
      index: true
    },
    transactionDate: Date,
    // Merchant credentials for reference
    merchantId: String,
    storeId: String,
    merchantHash: String,
    merchantUsername: String,
    // Payment channel and type
    paymentChannel: {
      type: String,
      enum: ['alfa_wallet', 'alfalah_bank', 'credit_card', 'debit_card']
    },
    // Authentication tokens from handshake
    authToken: String,
    sessionId: String,
    // Form data for page redirection
    formData: Schema.Types.Mixed, // Stores complete form data for payment
    // Response fields
    responseCode: String,
    responseMessage: String,
    authCode: String,
    basketId: String,
    // IPN (Instant Payment Notification) data
    ipnReceived: {
      type: Boolean,
      default: false
    },
    ipnData: {
      handshake_key: String,
      transaction_id: String,
      transaction_status: String,
      transaction_amount: Number,
      transaction_date: Date,
      response_code: String,
      response_message: String,
      merchant_id: String,
      store_id: String,
      channel_id: String,
      currency: String
    },
    // For tracking payment attempts
    paymentAttempts: [{
      attemptDate: {
        type: Date,
        default: Date.now
      },
      status: String,
      responseCode: String,
      responseMessage: String,
      transactionId: String,
      paymentMethod: String
    }],
    // Additional fields for Bank Alfalah page redirection
    handshakeCompleted: {
      type: Boolean,
      default: false
    },
    handshakeData: Schema.Types.Mixed, // Stores handshake response data
    returnUrl: String, // URL to redirect after payment
    merchantResponseUrl: String // IPN listener URL
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'payment_failed'],
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
    phone: { type: String, required: true },
    email: { type: String } // Added email for payment processing
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
  // Additional fields for payment processing
  requiresPayment: {
    type: Boolean,
    default: false
  },
  paymentExpiry: {
    type: Date,
    default: function() {
      // Payment expires in 24 hours for online payments
      return this.paymentMethod !== 'cash_on_delivery' ? 
        new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
    }
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

// Indexes for better query performance - UPDATED
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ 'alfaPayment.transactionId': 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'alfaPayment.paymentAttempts.attemptDate': -1 });
orderSchema.index({ paymentExpiry: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired payments
orderSchema.index({ orderId: 1 }); // For quick order lookup

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

// Update timestamps on save - ENHANCED
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set default payment method to COD if not specified
  if (!this.paymentMethod) {
    this.paymentMethod = 'cash_on_delivery';
  }
  
  // Set payment status based on payment method
  if (this.paymentMethod === 'cash_on_delivery') {
    this.paymentStatus = 'not_required';
    this.requiresPayment = false;
  } else {
    this.requiresPayment = true;
    if (!this.paymentStatus || this.paymentStatus === 'not_required') {
      this.paymentStatus = 'pending';
    }
  }
  
  // Set payment expiry for online payments
  if (this.paymentMethod !== 'cash_on_delivery' && !this.paymentExpiry) {
    this.paymentExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  
  // Initialize alfaPayment object if not exists
  if (!this.alfaPayment) {
    this.alfaPayment = {};
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

// Instance methods - ENHANCED

// Check if order can be processed (payment completed or COD)
orderSchema.methods.canProcess = function() {
  if (this.paymentMethod === 'cash_on_delivery') {
    return true;
  }
  return this.paymentStatus === 'completed';
};

// Check if payment is expired
orderSchema.methods.isPaymentExpired = function() {
  if (this.paymentMethod === 'cash_on_delivery' || !this.paymentExpiry) {
    return false;
  }
  return new Date() > this.paymentExpiry;
};

// Update payment status from IPN - ENHANCED
orderSchema.methods.updatePaymentFromIPN = function(ipnData) {
  this.alfaPayment.ipnReceived = true;
  this.alfaPayment.ipnData = {
    handshake_key: ipnData.handshake_key,
    transaction_id: ipnData.transaction_id,
    transaction_status: ipnData.transaction_status,
    transaction_amount: parseFloat(ipnData.transaction_amount),
    transaction_date: new Date(ipnData.transaction_date),
    response_code: ipnData.response_code,
    response_message: ipnData.response_message,
    merchant_id: ipnData.merchant_id,
    store_id: ipnData.store_id,
    channel_id: ipnData.channel_id,
    currency: ipnData.currency
  };
  
  // Update payment status based on IPN response
  if (ipnData.response_code === '00' || ipnData.transaction_status === 'success') {
    this.paymentStatus = 'completed';
    this.status = 'processing';
    this.alfaPayment.responseCode = ipnData.response_code;
    this.alfaPayment.responseMessage = ipnData.response_message;
  } else {
    this.paymentStatus = 'failed';
    this.status = 'payment_failed';
    this.alfaPayment.responseCode = ipnData.response_code;
    this.alfaPayment.responseMessage = ipnData.response_message;
  }
  
  return this.save();
};

// Add payment attempt record - ENHANCED
orderSchema.methods.addPaymentAttempt = function(status, responseCode, responseMessage, transactionId = null, paymentMethod = null) {
  if (!this.alfaPayment.paymentAttempts) {
    this.alfaPayment.paymentAttempts = [];
  }
  
  this.alfaPayment.paymentAttempts.push({
    attemptDate: new Date(),
    status,
    responseCode,
    responseMessage,
    transactionId: transactionId || this.alfaPayment.transactionId,
    paymentMethod: paymentMethod || this.paymentMethod
  });
  
  // Update main payment status if this is a failure
  if (status === 'failed') {
    this.paymentStatus = 'failed';
    this.status = 'payment_failed';
  }
  
  return this.save();
};

// Initialize Alfa Payment data
orderSchema.methods.initializeAlfaPayment = function(paymentData) {
  this.alfaPayment = {
    ...this.alfaPayment,
    transactionId: paymentData.transactionId,
    transactionDate: new Date(),
    merchantId: paymentData.merchantId,
    storeId: paymentData.storeId,
    merchantHash: paymentData.merchantHash,
    merchantUsername: paymentData.merchantUsername,
    paymentChannel: paymentData.paymentChannel,
    authToken: paymentData.authToken,
    sessionId: paymentData.sessionId,
    formData: paymentData.formData,
    basketId: paymentData.basketId || this.orderId,
    returnUrl: paymentData.returnUrl,
    merchantResponseUrl: paymentData.merchantResponseUrl
  };
  
  return this.save();
};

// Mark handshake as completed
orderSchema.methods.markHandshakeCompleted = function(handshakeData) {
  this.alfaPayment.handshakeCompleted = true;
  this.alfaPayment.handshakeData = handshakeData;
  this.alfaPayment.authToken = handshakeData.authToken;
  this.alfaPayment.sessionId = handshakeData.sessionId;
  
  return this.save();
};

// Static methods - ENHANCED

// Find orders by payment status
orderSchema.statics.findByPaymentStatus = function(paymentStatus) {
  return this.find({ paymentStatus });
};

// Find pending payments
orderSchema.statics.findPendingPayments = function() {
  return this.find({ 
    paymentStatus: 'pending',
    paymentMethod: { $ne: 'cash_on_delivery' }
  });
};

// Find expired payments
orderSchema.statics.findExpiredPayments = function() {
  return this.find({
    paymentStatus: 'pending',
    paymentMethod: { $ne: 'cash_on_delivery' },
    paymentExpiry: { $lt: new Date() }
  });
};

// Find orders by transaction ID
orderSchema.statics.findByTransactionId = function(transactionId) {
  return this.findOne({ 'alfaPayment.transactionId': transactionId });
};

// Find orders that need payment retry
orderSchema.statics.findFailedPayments = function() {
  return this.find({
    paymentStatus: 'failed',
    paymentMethod: { $ne: 'cash_on_delivery' },
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  });
};

// Virtual for payment status description
orderSchema.virtual('paymentStatusDescription').get(function() {
  const statusMap = {
    'pending': 'Payment Pending',
    'processing': 'Payment Processing',
    'completed': 'Payment Completed',
    'failed': 'Payment Failed',
    'refunded': 'Payment Refunded',
    'not_required': 'No Payment Required'
  };
  return statusMap[this.paymentStatus] || 'Unknown Status';
});

// Virtual for order status description
orderSchema.virtual('orderStatusDescription').get(function() {
  const statusMap = {
    'pending': 'Order Pending',
    'processing': 'Processing Order',
    'shipped': 'Order Shipped',
    'delivered': 'Order Delivered',
    'cancelled': 'Order Cancelled',
    'returned': 'Order Returned',
    'payment_failed': 'Payment Failed'
  };
  return statusMap[this.status] || 'Unknown Status';
});

// Ensure virtual fields are serialized
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);