const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const cloudinary = require('../config/cloudinary');

// Create a new product (Admin only)
exports.createProduct = async (req, res, next) => {
  try {
    const { title, description, price, discountPrice, categoryId, brand, stock, sku, specifications, variants } = req.body;

    // Process uploaded base images from Cloudinary
    const images = req.files?.baseImages?.map(file => ({
      url: file.path,
      public_id: file.filename,
      alt: file.originalname
    })) || [];

    // Process variant images
    const variantImages = {};
    if (req.files?.variantImages) {
      Object.keys(req.files.variantImages).forEach(variantIndex => {
        variantImages[variantIndex] = req.files.variantImages[variantIndex].map(file => ({
          url: file.path,
          public_id: file.filename,
          alt: file.originalname
        }));
      });
    }

    // Attach images to variants
    const processedVariants = variants?.map((variant, index) => ({
      ...variant,
      images: variantImages[index] || []
    }));

    // Create new product
    const product = new Product({
      title,
      description,
      price,
      discountPrice,
      images,
      categoryId,
      brand,
      stock,
      sku,
      specifications,
      variants: processedVariants || []
    });

    await product.save();

    // Log the action
    await AuditLog.create({
      userId: req.user._id,
      action: 'PRODUCT_CREATE',
      details: `Product created: ${product._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    ApiResponse.success(res, 201, 'Product created successfully', { product });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, 'Duplicate SKU or slug detected'));
    }
    next(error);
  }
};

// Get all products for admin with pagination, sorting, and filtering (Admin only)
exports.getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, categoryId, minPrice, maxPrice, attributeKey, attributeValue } = req.query;

    // Build query
    const query = {};
    if (categoryId) query.categoryId = categoryId;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (attributeKey && attributeValue) {
      query['variants.attributes'] = { $elemMatch: { key: attributeKey, value: attributeValue } };
    }

    const sortOption = sort || '-createdAt';
    const skip = (page - 1) * limit;

    // Fetch products
    const products = await Product.find(query)
      .populate('categoryId', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    ApiResponse.success(res, 200, 'Products retrieved successfully', {
      products,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

// Get a single product by ID (Admin only)
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name slug');

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    ApiResponse.success(res, 200, 'Product retrieved successfully', { product });
  } catch (error) {
    next(error);
  }
};

// Update a product (Admin only)
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    const { title, description, price, discountPrice, categoryId, brand, stock, sku, specifications, variants } = req.body;

    // Delete old base images from Cloudinary if new images are uploaded
    if (req.files?.baseImages?.length > 0) {
      for (const image of product.images) {
        await cloudinary.uploader.destroy(image.public_id);
      }
      product.images = req.files.baseImages.map(file => ({
        url: file.path,
        public_id: file.filename,
        alt: file.originalname
      }));
    }

    // Process variant images
    const variantImages = {};
    if (req.files?.variantImages) {
      Object.keys(req.files.variantImages).forEach(variantIndex => {
        variantImages[variantIndex] = req.files.variantImages[variantIndex].map(file => ({
          url: file.path,
          public_id: file.filename,
          alt: file.originalname
        }));
      });
    }

    // Update variants
    if (variants) {
      // Delete old variant images
      for (const variant of product.variants) {
        for (const image of variant.images) {
          await cloudinary.uploader.destroy(image.public_id);
        }
      }
      product.variants = variants.map((variant, index) => ({
        ...variant,
        images: variantImages[index] || variant.images || []
      }));
    }

    // Update product fields
    product.title = title || product.title;
    product.description = description || product.description;
    product.price = price || product.price;
    product.discountPrice = discountPrice !== undefined ? discountPrice : product.discountPrice;
    product.categoryId = categoryId || product.categoryId;
    product.brand = brand || product.brand;
    product.stock = stock !== undefined ? stock : product.stock;
    product.sku = sku || product.sku;
    product.specifications = specifications || product.specifications;

    await product.save();

    // Log the action
    await AuditLog.create({
      userId: req.user._id,
      action: 'PRODUCT_UPDATE',
      details: `Product updated: ${product._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    ApiResponse.success(res, 200, 'Product updated successfully', { product });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, 'Duplicate SKU or slug detected'));
    }
    next(error);
  }
};

// Delete a product (Admin only)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Delete base images from Cloudinary
    for (const image of product.images) {
      await cloudinary.uploader.destroy(image.public_id);
    }

    // Delete variant images from Cloudinary
    for (const variant of product.variants) {
      for (const image of variant.images) {
        await cloudinary.uploader.destroy(image.public_id);
      }
    }

    await product.deleteOne();

    // Log the action
    await AuditLog.create({
      userId: req.user._id,
      action: 'PRODUCT_DELETE',
      details: `Product deleted: ${product._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    ApiResponse.success(res, 200, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Get all products for customers (Public)
exports.getAllProductsForCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, categoryId, minPrice, maxPrice, search, attributeKey, attributeValue } = req.query;

    // Build query
    const query = { stock: { $gt: 0 } }; // Only show products in stock
    if (categoryId) query.categoryId = categoryId;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { 'variants.sku': { $regex: search, $options: 'i' } }
      ];
    }
    if (attributeKey && attributeValue) {
      query['variants.attributes'] = { $elemMatch: { key: attributeKey, value: attributeValue } };
    }

    const sortOption = sort || '-createdAt';
    const skip = (page - 1) * limit;

    // Fetch products
    const products = await Product.find(query)
      .select('-__v')
      .populate('categoryId', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    ApiResponse.success(res, 200, 'Products retrieved successfully', {
      products,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

// Get product details for customers (Public)
exports.getProductDetailsForCustomers = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .select('-__v')
      .populate('categoryId', 'name slug');

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    if (product.stock <= 0 && product.variants.every(v => v.stock <= 0)) {
      throw new ApiError(404, 'Product is out of stock');
    }

    ApiResponse.success(res, 200, 'Product details retrieved successfully', { product });
  } catch (error) {
    next(error);
  }
};