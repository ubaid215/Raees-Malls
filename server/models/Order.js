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
    default: 0,
    description: 'Total discount amount (includes promo code + online payment discount)'
  },
  // ✅ NEW: Track online payment discount separately for transparency
  onlinePaymentDiscount: {
    type: Number,
    min: 0,
    default: 0,
    description: 'Automatic discount applied for online payment methods (100 PKR)'
  },
  // Payment fields with Alfa Payment Gateway integration
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
  // Alfa Payment Gateway Integration Fields
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
    formData: Schema.Types.Mixed,
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
    // For tracking payment attempts - ENHANCED
    paymentAttempts: [{
      attemptDate: {
        type: Date,
        default: Date.now
      },
      status: String,
      responseCode: String,
      responseMessage: String,
      transactionId: String,
      transactionStatus: String,
      transactionAmount: Number,
      authToken: String,
      gatewayParams: Schema.Types.Mixed,
      rawUrl: String,
      paymentMethod: String
    }],
    // ✅ NEW: Track payment sync attempts
    syncAttempts: [{
      syncDate: {
        type: Date,
        default: Date.now
      },
      performed: Boolean,
      message: String,
      previousPaymentStatus: String,
      newPaymentStatus: String,
      triggeredBy: {
        userId: Schema.Types.ObjectId,
        userRole: String
      }
    }],
    // ✅ NEW: Latest transaction details
    latestTransaction: {
      transactionId: String,
      transactionDate: Date,
      amount: Number,
      status: String,
      responseCode: String,
      responseMessage: String
    },
    // ✅ NEW: Last synced timestamp
    lastSyncedAt: Date,
    // Additional fields for Bank Alfalah page redirection
    handshakeCompleted: {
      type: Boolean,
      default: false
    },
    handshakeData: Schema.Types.Mixed,
    returnUrl: String,
    merchantResponseUrl: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'payment_failed', 'confirmed'],
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
    email: { type: String }
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
  requiresPayment: {
    type: Boolean,
    default: false
  },
  paymentExpiry: {
    type: Date,
    default: function() {
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

// Indexes for better query performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ 'alfaPayment.transactionId': 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'alfaPayment.paymentAttempts.attemptDate': -1 });
orderSchema.index({ paymentExpiry: 1 }, { expireAfterSeconds: 0 });
orderSchema.index({ orderId: 1 });

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
  
  if (!this.paymentMethod) {
    this.paymentMethod = 'cash_on_delivery';
  }
  
  if (this.paymentMethod === 'cash_on_delivery') {
    this.paymentStatus = 'not_required';
    this.requiresPayment = false;
  } else {
    this.requiresPayment = true;
    if (!this.paymentStatus || this.paymentStatus === 'not_required') {
      this.paymentStatus = 'pending';
    }
  }
  
  if (this.paymentMethod !== 'cash_on_delivery' && !this.paymentExpiry) {
    this.paymentExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  
  if (!this.alfaPayment) {
    this.alfaPayment = {};
  }
  
  next();
});

// Calculate totals before saving - ENHANCED to include online payment discount
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
  
  // ✅ UPDATED: Total discount includes both promo code and online payment discount
  const totalDiscount = (this.discountAmount || 0);
  this.totalAmount = this.subtotal + this.totalShippingCost - totalDiscount;
  
  next();
});

// Instance methods

orderSchema.methods.canProcess = function() {
  if (this.paymentMethod === 'cash_on_delivery') {
    return true;
  }
  return this.paymentStatus === 'completed';
};

orderSchema.methods.isPaymentExpired = function() {
  if (this.paymentMethod === 'cash_on_delivery' || !this.paymentExpiry) {
    return false;
  }
  return new Date() > this.paymentExpiry;
};

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
  
  if (ipnData.response_code === '00' || ipnData.transaction_status === 'success') {
    this.paymentStatus = 'completed';
    this.status = 'confirmed';
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
  
  if (status === 'failed') {
    this.paymentStatus = 'failed';
    this.status = 'payment_failed';
  }
  
  return this.save();
};

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

orderSchema.methods.markHandshakeCompleted = function(handshakeData) {
  this.alfaPayment.handshakeCompleted = true;
  this.alfaPayment.handshakeData = handshakeData;
  this.alfaPayment.authToken = handshakeData.authToken;
  this.alfaPayment.sessionId = handshakeData.sessionId;
  
  return this.save();
};

// Static methods

orderSchema.statics.findByPaymentStatus = function(paymentStatus) {
  return this.find({ paymentStatus });
};

orderSchema.statics.findPendingPayments = function() {
  return this.find({ 
    paymentStatus: 'pending',
    paymentMethod: { $ne: 'cash_on_delivery' }
  });
};

orderSchema.statics.findExpiredPayments = function() {
  return this.find({
    paymentStatus: 'pending',
    paymentMethod: { $ne: 'cash_on_delivery' },
    paymentExpiry: { $lt: new Date() }
  });
};

orderSchema.statics.findByTransactionId = function(transactionId) {
  return this.findOne({ 'alfaPayment.transactionId': transactionId });
};

orderSchema.statics.findFailedPayments = function() {
  return this.find({
    paymentStatus: 'failed',
    paymentMethod: { $ne: 'cash_on_delivery' },
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });
};

// ✅ NEW: Virtual for total savings (code discount + online payment discount)
orderSchema.virtual('totalSavings').get(function() {
  const promoDiscount = this.discountAmount - (this.onlinePaymentDiscount || 0);
  return {
    promoCodeDiscount: promoDiscount > 0 ? promoDiscount : 0,
    onlinePaymentDiscount: this.onlinePaymentDiscount || 0,
    totalDiscount: this.discountAmount || 0
  };
});

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

orderSchema.virtual('orderStatusDescription').get(function() {
  const statusMap = {
    'pending': 'Order Pending',
    'processing': 'Processing Order',
    'confirmed': 'Order Confirmed',
    'shipped': 'Order Shipped',
    'delivered': 'Order Delivered',
    'cancelled': 'Order Cancelled',
    'returned': 'Order Returned',
    'payment_failed': 'Payment Failed'
  };
  return statusMap[this.status] || 'Unknown Status';
});

orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);