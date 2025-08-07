const mongoose = require('mongoose');

const salesItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  // For products with variants, specify which variant
  variantId: {
    type: String, // Color name or variant identifier
    required: false
  },
  // For storage/size options, specify which option
  optionType: {
    type: String,
    enum: ['storage', 'size', 'none'],
    default: 'none'
  },
  optionValue: {
    type: String, // Storage capacity or size value
    required: false
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscountAmount: {
    type: Number, // Cap for percentage discounts
    default: null
  },
  originalPrice: {
    type: Number,
    required: true
  },
  salePrice: {
    type: Number,
    required: true
  },
  stockLimit: {
    type: Number, // Limited stock for the sale
    default: null
  },
  soldCount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const salesSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Sales title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['flash_sale', 'hot_deal', 'seasonal_sale', 'clearance', 'weekend_deal', 'mega_sale'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'expired', 'cancelled'],
    default: 'draft'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10 // Higher number = higher priority
  },
  banner: {
    url: String,
    public_id: String,
    alt: String
  },
  displaySettings: {
    showOnHomepage: {
      type: Boolean,
      default: true
    },
    showCountdown: {
      type: Boolean,
      default: false
    },
    badgeText: {
      type: String,
      maxlength: 20
    },
    badgeColor: {
      type: String,
      default: '#ff4444'
    }
  },
  items: [salesItemSchema],
  totalSales: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Indexes for better performance
salesSchema.index({ status: 1, startDate: 1, endDate: 1 });
salesSchema.index({ type: 1, status: 1 });
salesSchema.index({ priority: -1 });

// Pre-save middleware to calculate sale prices and update status
salesSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate sale prices for each item
  this.items.forEach(item => {
    if (item.discountType === 'percentage') {
      const discountAmount = (item.originalPrice * item.discountValue) / 100;
      const finalDiscount = item.maxDiscountAmount ? 
        Math.min(discountAmount, item.maxDiscountAmount) : discountAmount;
      item.salePrice = item.originalPrice - finalDiscount;
    } else {
      item.salePrice = Math.max(0, item.originalPrice - item.discountValue);
    }
  });
  
  // Auto-update status based on dates
  const now = new Date();
  if (this.status === 'scheduled' && now >= this.startDate && now <= this.endDate) {
    this.status = 'active';
  } else if (this.status === 'active' && now > this.endDate) {
    this.status = 'expired';
  }
  
  next();
});

module.exports = mongoose.model('Sales', salesSchema);