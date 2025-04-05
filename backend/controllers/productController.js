const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('express-async-handler');

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({ success: true, data: product });
});

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    data: product
  });
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({ success: true, data: product });
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  await product.remove();const Product = require('../models/Product');
  const ErrorResponse = require('../utils/errorResponse');
  const asyncHandler = require('../middlewares/async');
  const cloudinary = require('cloudinary').v2;
  
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
  // @desc    Create new product
  // @route   POST /api/v1/products
  // @access  Private/Admin
  exports.createProduct = asyncHandler(async (req, res, next) => {
    // Upload images to Cloudinary
    let images = [];
    if (typeof req.body.images === 'string') {
      images.push(req.body.images);
    } else {
      images = req.body.images;
    }
  
    const imagesLinks = [];
    
    for (let i = 0; i < images.length; i++) {
      const result = await cloudinary.uploader.upload(images[i], {
        folder: 'ecommerce/products'
      });
  
      imagesLinks.push({
        public_id: result.public_id,
        url: result.secure_url
      });
    }
  
    req.body.images = imagesLinks;
    req.body.user = req.user.id;
  
    const product = await Product.create(req.body);
  
    res.status(201).json({
      success: true,
      product
    });
  });
  
  // @desc    Get all products
  // @route   GET /api/v1/products
  // @access  Public
  exports.getProducts = asyncHandler(async (req, res, next) => {
    const resPerPage = 8;
    const page = req.query.page || 1;
    
    let query = {};
    
    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Search by keyword
    if (req.query.keyword) {
      query.name = {
        $regex: req.query.keyword,
        $options: 'i'
      };
    }
    
    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query)
      .skip((resPerPage * page) - resPerPage)
      .limit(resPerPage);
    
    res.status(200).json({
      success: true,
      count: products.length,
      totalProducts,
      resPerPage,
      products
    });
  });
  
  // @desc    Get single product
  // @route   GET /api/v1/products/:id
  // @access  Public
  exports.getProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      product
    });
  });
  
  // @desc    Update product
  // @route   PUT /api/v1/products/:id
  // @access  Private/Admin
  exports.updateProduct = asyncHandler(async (req, res, next) => {
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user is product owner or admin
    if (product.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this product`, 401));
    }
    
    // Handle images update
    if (req.body.images) {
      // Delete old images from Cloudinary
      for (let i = 0; i < product.images.length; i++) {
        await cloudinary.uploader.destroy(product.images[i].public_id);
      }
      
      // Upload new images
      let images = [];
      if (typeof req.body.images === 'string') {
        images.push(req.body.images);
      } else {
        images = req.body.images;
      }
      
      const imagesLinks = [];
      
      for (let i = 0; i < images.length; i++) {
        const result = await cloudinary.uploader.upload(images[i], {
          folder: 'ecommerce/products'
        });
        
        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url
        });
      }
      
      req.body.images = imagesLinks;
    }
    
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      product
    });
  });
  
  // @desc    Delete product
  // @route   DELETE /api/v1/products/:id
  // @access  Private/Admin
  exports.deleteProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user is product owner or admin
    if (product.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this product`, 401));
    }
    
    // Delete images from Cloudinary
    for (let i = 0; i < product.images.length; i++) {
      await cloudinary.uploader.destroy(product.images[i].public_id);
    }
    
    await product.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  });

  res.status(200).json({ success: true, data: {} });
});