const mongoose = require('mongoose');
const slugify = require('slugify');

const attributeSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Attribute key is required'],
    trim: true,
    enum: ['size', 'color', 'material', 'style', 'ram'],
  },
  value: {
    type: String,
    required: [true, 'Attribute value is required'],
    trim: true
  }
});

attributeSchema.pre('validate', function(next) {
  if (this.key) {
    this.key = this.key.toLowerCase();
  }
  next();
});

const variantSchema = new mongoose.Schema({
  sku: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  price: {
    type: Number,
    required: [true, 'Variant price is required'],
    min: [0, 'Variant price cannot be negative']
  },
  discountPrice: {
    type: Number,
    min: [0, 'Variant discount price cannot be negative'],
    validate: {
      validator: function (value) {
        return value < this.price;
      },
      message: 'Variant discount price must be less than the variant price'
    }
  },
  stock: {
    type: Number,
    required: [true, 'Variant stock quantity is required'],
    min: [0, 'Variant stock cannot be negative']
  },
  attributes: [attributeSchema],
  images: [{
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
      required: true
    },
    alt: {
      type: String
    }
  }]
});

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product base price is required'],
    min: [0, 'Price cannot be negative']
  },
  discountPrice: {
    type: Number,
    min: [0, 'Discount price cannot be negative'],
    validate: {
      validator: function (value) {
        return value < this.price;
      },
      message: 'Discount price must be less than the base price'
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
      required: true
    },
    alt: {
      type: String
    }
  }],
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  stock: {
    type: Number,
    required: [true, 'Base stock quantity is required'],
    min: [0, 'Stock cannot be negative']
  },
  brand: {
    type: String,
    trim: true,
    minlength: [2, 'Brand must be at least 2 characters'],
    maxlength: [50, 'Brand cannot exceed 50 characters']
  },
  sku: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  variants: [variantSchema],
  specifications: [{
    key: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  }],
  seo: {
    title: {
      type: String,
      trim: true,
      maxlength: [60, 'SEO title cannot exceed 60 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [160, 'SEO description cannot exceed 160 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    }
  },
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5']
  },
  numReviews: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
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

const generateSKU = (brand, title, attributes = []) => {
  const cleanBrand = (brand || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 3);
  const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 3);

  const attrCodes = attributes.map(attr =>
    attr.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 2)
  ).join('');

  let sku = `${cleanBrand}-${cleanTitle}`;
  if (attributes.length > 0) {
    sku += `-${attrCodes}`;
  }

  const timestamp = Date.now().toString().slice(-4);
  sku += `-${timestamp}`;

  return sku;
};

productSchema.pre('save', async function (next) {
  this.updatedAt = Date.now();

  if (!this.sku) {
    let sku = generateSKU(this.brand, this.title);
    let counter = 1;

    while (await mongoose.models.Product.findOne({ sku, _id: { $ne: this._id } })) {
      sku = generateSKU(this.brand, this.title) + `-${counter}`;
      counter++;
    }
    this.sku = sku;
  }

  for (const variant of this.variants) {
    if (!variant.sku) {
      let variantSku = generateSKU(this.brand, this.title, variant.attributes);
      let counter = 1;

      while (await mongoose.models.Product.findOne({
        $or: [
          { sku: variantSku, _id: { $ne: this._id } },
          { 'variants.sku': variantSku, _id: { $ne: this._id } }
        ]
      })) {
        variantSku = generateSKU(this.brand, this.title, variant.attributes) + `-${counter}`;
        counter++;
      }
      variant.sku = variantSku;
    }
  }

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

module.exports = mongoose.model('Product', productSchema);