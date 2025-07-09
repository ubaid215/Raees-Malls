const mongoose = require('mongoose');
const slugify = require('slugify');

// Storage options schema for tech products
const storageOptionSchema = new mongoose.Schema({
  capacity: {
    type: String,
    required: [true, 'Storage capacity is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Storage option price is required'],
    min: [0, 'Storage option price cannot be negative'],
  },
  discountPrice: {
    type: Number,
    min: [0, 'Storage option discount price cannot be negative'],
    validate: {
      validator: function (value) {
        return !value || value < this.price;
      },
      message: 'Storage option discount price must be less than the storage option price',
    },
  },
  stock: {
    type: Number,
    required: [true, 'Storage option stock quantity is required'],
    min: [0, 'Storage option stock cannot be negative'],
  },
  sku: {
    type: String,
    trim: true,
    uppercase: true,
  },
}, { _id: false });

// Size options schema for non-tech products (clothes, etc.)
const sizeOptionSchema = new mongoose.Schema({
  size: {
    type: String,
    required: [true, 'Size is required'],
    trim: true,
    uppercase: true,
  },
  price: {
    type: Number,
    required: [true, 'Size option price is required'],
    min: [0, 'Size option price cannot be negative'],
  },
  discountPrice: {
    type: Number,
    min: [0, 'Size option discount price cannot be negative'],
    validate: {
      validator: function (value) {
        return !value || value < this.price;
      },
      message: 'Size option discount price must be less than the size option price',
    },
  },
  stock: {
    type: Number,
    required: [true, 'Size option stock quantity is required'],
    min: [0, 'Size option stock cannot be negative'],
  },
  sku: {
    type: String,
    trim: true,
    uppercase: true,
  },
}, { _id: false });

// Improved variant schema - supports both simple color variants and complex options
const variantSchema = new mongoose.Schema({
  color: {
    name: {
      type: String,
      required: [true, 'Color name is required for variant'],
      trim: true,
      maxlength: [50, 'Color name cannot exceed 50 characters'],
    },
  },
  // Direct pricing and stock for simple color variants
  price: {
    type: Number,
    min: [0, 'Variant price cannot be negative'],
  },
  discountPrice: {
    type: Number,
    min: [0, 'Variant discount price cannot be negative'],
    validate: {
      validator: function (value) {
        return !value || value < this.price;
      },
      message: 'Variant discount price must be less than the variant price',
    },
  },
  stock: {
    type: Number,
    min: [0, 'Variant stock cannot be negative'],
  },
  sku: {
    type: String,
    trim: true,
    uppercase: true,
  },
  // Complex options for tech products
  storageOptions: {
    type: [storageOptionSchema],
    default: undefined // Makes the field not appear in documents when empty
  },
  // Complex options for clothing/accessories
  sizeOptions: {
    type: [sizeOptionSchema],
    default: undefined // Makes the field not appear in documents when empty
  },
  images: [{
    url: String,
    public_id: String,
    alt: String,
  }],
  videos: [{
    url: String,
    public_id: String,
    alt: String,
  }],
}, { _id: false });

// Updated validation for variants - supports three patterns
variantSchema.pre('validate', function (next) {
  const hasDirectPricing = this.price !== undefined && this.stock !== undefined;
  const hasStorageOptions = this.storageOptions && this.storageOptions.length > 0;
  const hasSizeOptions = this.sizeOptions && this.sizeOptions.length > 0;
  
  // Must have either direct pricing OR storage options OR size options
  if (!hasDirectPricing && !hasStorageOptions && !hasSizeOptions) {
    return next(new Error('Variant must have either direct pricing (price & stock) or storage options or size options'));
  }
  
  // Cannot have direct pricing WITH storage/size options
  if (hasDirectPricing && (hasStorageOptions || hasSizeOptions)) {
    return next(new Error('Variant cannot have both direct pricing and storage/size options'));
  }
  
  // Cannot have both storage and size options
  if (hasStorageOptions && hasSizeOptions) {
    return next(new Error('Variant cannot have both storage options and size options'));
  }
  
  next();
});

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [3000, 'Description cannot exceed 3000 characters'],
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
  },
  discountPrice: {
    type: Number,
    min: [0, 'Discount price cannot be negative'],
    validate: {
      validator: function (value) {
        return !value || !this.price || value < this.price;
      },
      message: 'Discount price must be less than the base price',
    },
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative'],
  },
  color: {
    name: {
      type: String,
      trim: true,
      maxlength: [50, 'Color name cannot exceed 50 characters'],
    },
  },
  // Made images and videos optional - validation will be handled in frontend logic
  images: [
    {
      url: {
        type: String,
      },
      public_id: {
        type: String,
      },
      alt: {
        type: String,
      },
    },
  ],
  videos: [
    {
      url: {
        type: String,
      },
      public_id: {
        type: String,
      },
      alt: {
        type: String,
      },
    },
  ],
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
  },
  stock: {
    type: Number,
    min: [0, 'Stock cannot be negative'],
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    minlength: [2, 'Brand must be at least 2 characters'],
    maxlength: [50, 'Brand cannot exceed 50 characters'],
  },
  sku: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
  },
  variants: [variantSchema],
  // Specifications kept only at product level
  specifications: [
    {
      key: {
        type: String,
        required: true,
      },
      value: {
        type: String,
        required: true,
      },
    },
  ],
  features: [
    {
      type: String,
      trim: true,
      minlength: [1, 'Feature must be at least 1 character'],
      maxlength: [200, 'Feature cannot exceed 200 characters'],
    },
  ],
  seo: {
    title: {
      type: String,
      trim: true,
      maxlength: [60, 'SEO title cannot exceed 60 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [3000, 'SEO description cannot exceed 3000 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5'],
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Product-level validation - must have either base pricing or variants
productSchema.pre('validate', function (next) {
  const hasBasePricing = this.price !== undefined && this.stock !== undefined;
  const hasVariants = this.variants && this.variants.length > 0;
  
  if (!hasBasePricing && !hasVariants) {
    return next(new Error('Product must have either base-level pricing (price & stock) or variants'));
  }
  
  next();
});

// SKU generation helper function
const generateSKU = (brand, title, suffix = '') => {
  const cleanBrand = (brand || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 3);
  const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 3);
  const timestamp = Date.now().toString().slice(-4);
  
  let sku = `${cleanBrand}-${cleanTitle}-${timestamp}`;
  
  if (suffix) {
    sku += `-${suffix}`;
  }

  return sku;
};

// Pre-save middleware for SKU generation and slug creation
productSchema.pre('save', async function (next) {
  this.updatedAt = Date.now();

  // Generate main product SKU
  if (!this.sku) {
    let sku = generateSKU(this.brand, this.title);
    let counter = 1;

    while (await mongoose.models.Product.findOne({ sku, _id: { $ne: this._id } })) {
      sku = generateSKU(this.brand, this.title, counter.toString());
      counter++;
    }
    this.sku = sku;
  }

  // Generate SKUs for variants
  for (const variant of this.variants) {
    // Generate SKU for simple color variants
    if (variant.price !== undefined && variant.stock !== undefined && !variant.sku) {
      const colorCode = variant.color.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 3);
      let variantSku = generateSKU(this.brand, this.title, colorCode);
      let counter = 1;

      while (
        await mongoose.models.Product.findOne({
          $or: [
            { sku: variantSku, _id: { $ne: this._id } },
            { 'variants.sku': variantSku, _id: { $ne: this._id } },
          ],
        })
      ) {
        variantSku = generateSKU(this.brand, this.title, `${colorCode}${counter}`);
        counter++;
      }
      variant.sku = variantSku;
    }

    // Generate SKUs for storage options
    for (const storageOption of variant.storageOptions || []) {
      if (!storageOption.sku) {
        const storageCode = storageOption.capacity.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
        let storageSku = generateSKU(this.brand, this.title, storageCode);
        let counter = 1;

        while (
          await mongoose.models.Product.findOne({
            $or: [
              { sku: storageSku, _id: { $ne: this._id } },
              { 'variants.storageOptions.sku': storageSku, _id: { $ne: this._id } },
            ],
          })
        ) {
          storageSku = generateSKU(this.brand, this.title, `${storageCode}${counter}`);
          counter++;
        }
        storageOption.sku = storageSku;
      }
    }

    // Generate SKUs for size options
    for (const sizeOption of variant.sizeOptions || []) {
      if (!sizeOption.sku) {
        const sizeCode = sizeOption.size.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 3);
        let sizeSku = generateSKU(this.brand, this.title, sizeCode);
        let counter = 1;

        while (
          await mongoose.models.Product.findOne({
            $or: [
              { sku: sizeSku, _id: { $ne: this._id } },
              { 'variants.sizeOptions.sku': sizeSku, _id: { $ne: this._id } },
            ],
          })
        ) {
          sizeSku = generateSKU(this.brand, this.title, `${sizeCode}${counter}`);
          counter++;
        }
        sizeOption.sku = sizeSku;
      }
    }
  }

  // Generate SEO slug
  if (!this.seo.slug) {
    let baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await mongoose.models.Product.findOne({ 'seo.slug': slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.seo.slug = slug;
  }

  next();
});

// Index for better performance
productSchema.index({ 'seo.slug': 1 });
productSchema.index({ sku: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);