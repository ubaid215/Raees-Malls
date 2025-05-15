const mongoose = require('mongoose');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const cloudinary = require('../config/cloudinary');

exports.createProduct = async (req, res, next) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    const { title, description, price, discountPrice, categoryId, brand, stock, specifications, features, variants, seo, isFeatured } = req.body;

    if (discountPrice !== undefined && discountPrice >= price) {
      throw new ApiError(400, 'Discount price must be less than the base price');
    }

    if (!req.files?.baseImages?.length) {
      throw new ApiError(400, 'At least one base image is required');
    }

    const images = req.files.baseImages.map(file => ({
      url: file.path,
      public_id: file.filename,
      alt: file.originalname
    }));

    const videos = req.files?.baseVideos?.map(file => ({
      url: file.path,
      public_id: file.filename,
      alt: file.originalname
    })) || [];

    const variantImages = {};
    const variantVideos = {};
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (key.startsWith('variantImages[')) {
          const index = key.match(/\[(\d+)\]/)[1];
          variantImages[index] = req.files[key].map(file => ({
            url: file.path,
            public_id: file.filename,
            alt: file.originalname
          }));
        } else if (key.startsWith('variantVideos[')) {
          const index = key.match(/\[(\d+)\]/)[1];
          variantVideos[index] = req.files[key].map(file => ({
            url: file.path,
            public_id: file.filename,
            alt: file.originalname
          }));
        }
      });
    }

    let parsedVariants = variants;
    if (typeof variants === 'string') {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (error) {
        throw new ApiError(400, 'Invalid variants format');
      }
    }

    const processedVariants = parsedVariants?.map((variant, index) => {
      if (variant.discountPrice !== undefined && variant.discountPrice >= variant.price) {
        throw new ApiError(400, `Variant ${index + 1} discount price must be less than variant price`);
      }
      return {
        ...variant,
        images: variantImages[index] || [],
        videos: variantVideos[index] || []
      };
    }) || [];

    let parsedSeo = seo;
    if (typeof seo === 'string') {
      try {
        parsedSeo = JSON.parse(seo);
      } catch (error) {
        throw new ApiError(400, 'Invalid SEO format');
      }
    }

    let parsedSpecifications = specifications;
    if (typeof specifications === 'string') {
      try {
        parsedSpecifications = JSON.parse(specifications);
      } catch (error) {
        throw new ApiError(400, 'Invalid specifications format');
      }
    }

    let parsedFeatures = features;
    if (typeof features === 'string') {
      try {
        parsedFeatures = JSON.parse(features);
      } catch (error) {
        throw new ApiError(400, 'Invalid features format');
      }
    }

    const product = new Product({
      title,
      description,
      price,
      discountPrice,
      images,
      videos,
      categoryId,
      brand,
      stock,
      specifications: parsedSpecifications,
      features: parsedFeatures || [],
      variants: processedVariants,
      seo: parsedSeo,
      isFeatured: isFeatured || false
    });

    await product.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'PRODUCT_CREATE',
      details: `Product created: ${product._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    if (req.io) {
      req.io.emit('productCreated', {
        product: product.toObject(),
        displayPrice: product.discountPrice || product.price
      });
    }

    ApiResponse.success(res, 201, 'Product created successfully', { product });
  } catch (error) {
    console.error('Create product error:', error);
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

exports.getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, categoryId, minPrice, maxPrice, attributeKey, attributeValue, search, isFeatured } = req.query;

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
    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === 'true';
    }

    const sortOption = sort || '-createdAt';
    const skip = (page - 1) * limit;

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

exports.updateProduct = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, 'Invalid product ID');
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    const { title, description, price, discountPrice, categoryId, brand, stock, specifications, features, variants, seo, isFeatured } = req.body;

    if (discountPrice !== undefined) {
      const basePrice = price || product.price;
      if (discountPrice >= basePrice) {
        throw new ApiError(400, 'Discount price must be less than the base price');
      }
    }

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

    if (req.files?.baseVideos?.length > 0) {
      for (const video of product.videos) {
        await cloudinary.uploader.destroy(video.public_id, { resource_type: 'video' });
      }
      product.videos = req.files.baseVideos.map(file => ({
        url: file.path,
        public_id: file.filename,
        alt: file.originalname
      }));
    } else {
      product.videos = product.videos || [];
    }

    const variantImages = {};
    const variantVideos = {};
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (key.startsWith('variantImages[')) {
          const index = key.match(/\[(\d+)\]/)[1];
          variantImages[index] = req.files[key].map(file => ({
            url: file.path,
            public_id: file.filename,
            alt: file.originalname
          }));
        } else if (key.startsWith('variantVideos[')) {
          const index = key.match(/\[(\d+)\]/)[1];
          variantVideos[index] = req.files[key].map(file => ({
            url: file.path,
            public_id: file.filename,
            alt: file.originalname
          }));
        }
      });
    }

    let parsedVariants = variants;
    if (typeof variants === 'string') {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (error) {
        throw new ApiError(400, 'Invalid variants format');
      }
    }

    if (parsedVariants) {
      for (const variant of product.variants) {
        for (const image of variant.images) {
          await cloudinary.uploader.destroy(image.public_id);
        }
        for (const video of variant.videos) {
          await cloudinary.uploader.destroy(video.public_id, { resource_type: 'video' });
        }
      }

      product.variants = parsedVariants.map((variant, index) => {
        if (variant.discountPrice !== undefined && variant.discountPrice >= variant.price) {
          throw new ApiError(400, `Variant ${index + 1} discount price must be less than variant price`);
        }
        return {
          ...variant,
          images: variantImages[index] || variant.images || [],
          videos: variantVideos[index] || variant.videos || []
        };
      });
    }

    let parsedSeo = seo;
    if (typeof seo === 'string') {
      try {
        parsedSeo = JSON.parse(seo);
      } catch (error) {
        throw new ApiError(400, 'Invalid SEO format');
      }
    }

    let parsedSpecifications = specifications;
    if (typeof specifications === 'string') {
      try {
        parsedSpecifications = JSON.parse(specifications);
      } catch (error) {
        throw new ApiError(400, 'Invalid specifications format');
      }
    }

    let parsedFeatures = features;
    if (typeof features === 'string') {
      try {
        parsedFeatures = JSON.parse(features);
      } catch (error) {
        throw new ApiError(400, 'Invalid features format');
      }
    }

    product.title = title || product.title;
    product.description = description || product.description;
    product.price = price || product.price;
    product.discountPrice = discountPrice !== undefined ? discountPrice : product.discountPrice;
    product.categoryId = categoryId || product.categoryId;
    product.brand = brand || product.brand;
    product.stock = stock !== undefined ? stock : product.stock;
    product.specifications = parsedSpecifications || product.specifications;
    product.features = parsedFeatures || product.features || [];
    product.seo = parsedSeo || product.seo;
    product.isFeatured = isFeatured !== undefined ? isFeatured : product.isFeatured;

    await product.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'PRODUCT_UPDATE',
      details: `Product updated: ${product._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

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

exports.deleteProduct = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, 'Invalid product ID');
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    for (const image of product.images) {
      await cloudinary.uploader.destroy(image.public_id);
    }
    for (const video of product.videos) {
      await cloudinary.uploader.destroy(video.public_id, { resource_type: 'video' });
    }

    for (const variant of product.variants) {
      for (const image of variant.images) {
        await cloudinary.uploader.destroy(image.public_id);
      }
      for (const video of variant.videos) {
        await cloudinary.uploader.destroy(video.public_id, { resource_type: 'video' });
      }
    }

    await product.deleteOne();

    await AuditLog.create({
      userId: req.user._id,
      action: 'PRODUCT_DELETE',
      details: `Product deleted: ${product._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    if (req.io) {
      req.io.emit('productDeleted', { productId: product._id });
    }

    ApiResponse.success(res, 200, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.getAllProductsForCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, categoryId, minPrice, maxPrice, search, attributeKey, attributeValue, isFeatured } = req.query;

    const query = { stock: { $gt: 0 } };
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
    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === 'true';
    }

    const sortOption = sort || '-createdAt';
    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .select('-__v')
      .populate('categoryId', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

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

exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort } = req.query;

    const query = { isFeatured: true, stock: { $gt: 0 } };
    const sortOption = sort || '-createdAt';
    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .select('-__v')
      .populate('categoryId', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const productsWithDisplayPrice = products.map(product => ({
      ...product.toObject(),
      displayPrice: product.discountPrice || product.price
    }));

    const total = await Product.countDocuments(query);

    ApiResponse.success(res, 200, 'Featured products retrieved successfully', {
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