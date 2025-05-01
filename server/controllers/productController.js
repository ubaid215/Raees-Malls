const mongoose = require('mongoose');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const cloudinary = require('../config/cloudinary');

// Create a new product (Admin only)
exports.createProduct = async (req, res, next) => {
  try {
    const { title, description, price, discountPrice, categoryId, brand, stock, specifications, variants, seo } = req.body;

    // Validate discount price
    if (discountPrice !== undefined && discountPrice >= price) {
      throw new ApiError(400, 'Discount price must be less than the base price');
    }

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

    // Parse variants if they are a JSON string
    let parsedVariants = variants;
    if (typeof variants === 'string') {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (error) {
        throw new ApiError(400, 'Invalid variants format');
      }
    }

    // Attach images to variants and validate variant discount prices
    const processedVariants = parsedVariants?.map((variant, index) => {
      if (variant.discountPrice !== undefined && variant.discountPrice >= variant.price) {
        throw new ApiError(400, `Variant ${index + 1} discount price must be less than variant price`);
      }
      return {
        ...variant,
        images: variantImages[index] || []
      };
    }) || [];

    // Parse seo if it is a JSON string
    let parsedSeo = seo;
    if (typeof seo === 'string') {
      try {
        parsedSeo = JSON.parse(seo);
      } catch (error) {
        throw new ApiError(400, 'Invalid SEO format');
      }
    }

    // Parse specifications if it is a JSON string
    let parsedSpecifications = specifications;
    if (typeof specifications === 'string') {
      try {
        parsedSpecifications = JSON.parse(specifications);
      } catch (error) {
        throw new ApiError(400, 'Invalid specifications format');
      }
    }

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
      specifications: parsedSpecifications,
      variants: processedVariants,
      seo: parsedSeo
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

    // Emit Socket.IO event for product creation if io is available
    if (req.io) {
      req.io.emit('productCreated', {
        product: product.toObject(),
        displayPrice: product.discountPrice || product.price
      });
    }

    ApiResponse.success(res, 201, 'Product created successfully', { product });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = {
          message: error.errors[key].message,
          path: key
        };
      });
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    if (error.code === 11000) {
      return next(new ApiError(400, 'Duplicate SKU detected'));
    }
    next(error);
  }
};

// Get all products for admin with pagination, sorting, and filtering (Admin only)
exports.getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, categoryId, minPrice, maxPrice, attributeKey, attributeValue, search } = req.query;

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
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, 'Invalid product ID');
    }

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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, 'Invalid product ID');
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    const { title, description, price, discountPrice, categoryId, brand, stock, specifications, variants, seo } = req.body;

    // Validate discount price
    if (discountPrice !== undefined) {
      const basePrice = price || product.price;
      if (discountPrice >= basePrice) {
        throw new ApiError(400, 'Discount price must be less than the base price');
      }
    }

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

    // Parse variants if they are a JSON string
    let parsedVariants = variants;
    if (typeof variants === 'string') {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (error) {
        throw new ApiError(400, 'Invalid variants format');
      }
    }

    // Update variants and validate variant discount prices
    if (parsedVariants) {
      // Delete old variant images
      for (const variant of product.variants) {
        for (const image of variant.images) {
          await cloudinary.uploader.destroy(image.public_id);
        }
      }

      product.variants = parsedVariants.map((variant, index) => {
        if (variant.discountPrice !== undefined && variant.discountPrice >= variant.price) {
          throw new ApiError(400, `Variant ${index + 1} discount price must be less than variant price`);
        }
        return {
          ...variant,
          images: variantImages[index] || variant.images || []
        };
      });
    }

    // Parse seo if it is a JSON string
    let parsedSeo = seo;
    if (typeof seo === 'string') {
      try {
        parsedSeo = JSON.parse(seo);
      } catch (error) {
        throw new ApiError(400, 'Invalid SEO format');
      }
    }

    // Parse specifications if it is a JSON string
    let parsedSpecifications = specifications;
    if (typeof specifications === 'string') {
      try {
        parsedSpecifications = JSON.parse(specifications);
      } catch (error) {
        throw new ApiError(400, 'Invalid specifications format');
      }
    }

    // Update product fields
    product.title = title || product.title;
    product.description = description || product.description;
    product.price = price || product.price;
    product.discountPrice = discountPrice !== undefined ? discountPrice : product.discountPrice;
    product.categoryId = categoryId || product.categoryId;
    product.brand = brand || product.brand;
    product.stock = stock !== undefined ? stock : product.stock;
    product.specifications = parsedSpecifications || product.specifications;
    product.seo = parsedSeo || product.seo;

    await product.save();

    // Log the action
    await AuditLog.create({
      userId: req.user._id,
      action: 'PRODUCT_UPDATE',
      details: `Product updated: ${product._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Emit Socket.IO event for product update if io is available
    if (req.io) {
      req.io.emit('productUpdated', {
        product: product.toObject(),
        displayPrice: product.discountPrice || product.price
      });
    }

    ApiResponse.success(res, 200, 'Product updated successfully', { product });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = {
          message: error.errors[key].message,
          path: key
        };
      });
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    if (error.code === 11000) {
      return next(new ApiError(400, 'Duplicate SKU detected'));
    }
    next(error);
  }
};

// Delete a product (Admin only)
exports.deleteProduct = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, 'Invalid product ID');
    }

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

    // Emit Socket.IO event for product deletion if io is available
    if (req.io) {
      req.io.emit('productDeleted', { productId: product._id });
    }

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
      query.$or = [
        { 
          price: {
            ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
            ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {})
          },
          discountPrice: null
        },
        {
          discountPrice: {
            ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
            ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {})
          }
        }
      ];
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
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

    // Map products to include display price
    const productsWithDisplayPrice = products.map(product => ({
      ...product.toObject(),
      displayPrice: product.discountPrice || product.price
    }));

    const total = await Product.countDocuments(query);

    ApiResponse.success(res, 200, 'Products retrieved successfully', {
      products: productsWithDisplayPrice,
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, 'Invalid product ID');
    }

    const product = await Product.findById(req.params.id)
      .select('-__v')
      .populate('categoryId', 'name slug');

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    if (product.stock <= 0 && product.variants.every(v => v.stock <= 0)) {
      throw new ApiError(404, 'Product is out of stock');
    }

    // Add display price to product
    const productWithDisplayPrice = {
      ...product.toObject(),
      displayPrice: product.discountPrice || product.price,
      variants: product.variants.map(variant => ({
        ...variant,
        displayPrice: variant.discountPrice || variant.price
      }))
    };

    ApiResponse.success(res, 200, 'Product details retrieved successfully', { 
      product: productWithDisplayPrice 
    });
  } catch (error) {
    next(error);
  }
};