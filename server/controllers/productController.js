const mongoose = require('mongoose');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const cloudinary = require('../config/cloudinary');

exports.createProduct = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, 'User not authenticated'));
    }

    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request files:', JSON.stringify(req.files, null, 2));

    if (!req.body || Object.keys(req.body).length === 0) {
      return next(new ApiError(400, 'Request body is missing or empty'));
    }

    const { title, description, price, categoryId, stock, discountPrice, shippingCost, brand, specifications, features, variants, seo, isFeatured, color } = req.body;

    if (!title || !description || !price || !categoryId || !stock) {
      return next(new ApiError(400, 'Title, description, price, categoryId, and stock are required'));
    }

    // Fixed discount price validation
    if (discountPrice !== undefined && discountPrice !== null && discountPrice !== '') {
      const numericPrice = parseFloat(price);
      const numericDiscountPrice = parseFloat(discountPrice);
      
      if (isNaN(numericPrice) || isNaN(numericDiscountPrice)) {
        return next(new ApiError(400, 'Price and discount price must be valid numbers'));
      }
      
      if (numericDiscountPrice >= numericPrice) {
        return next(new ApiError(400, 'Discount price must be less than the base price'));
      }
    }

    // Parse color
    let parsedColor = color;
    if (typeof color === 'string') {
      try {
        parsedColor = JSON.parse(color);
      } catch (error) {
        return next(new ApiError(400, 'Invalid color format'));
      }
    }

    const images = req.files?.baseImages?.map(file => ({
      url: file.path,
      public_id: file.filename,
      alt: file.originalname,
    })) || [];

    const videos = req.files?.baseVideos?.map(file => ({
      url: file.path,
      public_id: file.filename,
      alt: file.originalname,
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
            alt: file.originalname,
          }));
        } else if (key.startsWith('variantVideos[')) {
          const index = key.match(/\[(\d+)\]/)[1];
          variantVideos[index] = req.files[key].map(file => ({
            url: file.path,
            public_id: file.filename,
            alt: file.originalname,
          }));
        }
      });
    }

    let parsedVariants = variants;
    if (typeof variants === 'string') {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (error) {
        return next(new ApiError(400, 'Invalid variants format'));
      }
    }

    // Process variants with proper validation
    const processedVariants = parsedVariants?.map((variant, index) => {
      if (variant.discountPrice !== undefined && variant.discountPrice !== null && variant.discountPrice !== '') {
        const variantPrice = parseFloat(variant.price);
        const variantDiscountPrice = parseFloat(variant.discountPrice);
        
        if (isNaN(variantPrice) || isNaN(variantDiscountPrice)) {
          throw new ApiError(400, `Variant ${index + 1} price and discount price must be valid numbers`);
        }
        
        if (variantDiscountPrice >= variantPrice) {
          throw new ApiError(400, `Variant ${index + 1} discount price must be less than variant price`);
        }
      }

      let parsedVariantSpecifications = variant.specifications;
      if (typeof variant.specifications === 'string') {
        try {
          parsedVariantSpecifications = JSON.parse(variant.specifications);
        } catch (error) {
          return next(new ApiError(400, `Invalid specifications format for variant ${index + 1}`));
        }
      }

      let parsedVariantColor = variant.color;
      if (typeof variant.color === 'string') {
        try {
          parsedVariantColor = JSON.parse(variant.color);
        } catch (error) {
          return next(new ApiError(400, `Invalid color format for variant ${index + 1}`));
        }
      }

      return {
        ...variant,
        color: parsedVariantColor,
        images: variantImages[index] || [],
        videos: variantVideos[index] || [],
        specifications: parsedVariantSpecifications || [],
      };
    }) || [];

    let parsedSeo = seo;
    if (typeof seo === 'string') {
      try {
        parsedSeo = JSON.parse(seo);
      } catch (error) {
        return next(new ApiError(400, 'Invalid SEO format'));
      }
    } else if (typeof seo === 'object') {
      parsedSeo = seo;
    }

    let parsedSpecifications = specifications;
    if (typeof specifications === 'string') {
      try {
        parsedSpecifications = JSON.parse(specifications);
      } catch (error) {
        return next(new ApiError(400, 'Invalid specifications format'));
      }
    }

    let parsedFeatures = features;
    if (typeof features === 'string') {
      try {
        parsedFeatures = JSON.parse(features);
      } catch (error) {
        return next(new ApiError(400, 'Invalid features format'));
      }
    }

    const product = new Product({
      title,
      description,
      price: parseFloat(price),
      discountPrice: discountPrice && discountPrice !== '' ? parseFloat(discountPrice) : undefined,
      shippingCost: shippingCost ? parseFloat(shippingCost) : 0,
      color: parsedColor,
      images,
      videos,
      categoryId,
      brand,
      stock: parseInt(stock),
      specifications: parsedSpecifications,
      features: parsedFeatures || [],
      variants: processedVariants,
      seo: parsedSeo,
      isFeatured: isFeatured === 'true' || isFeatured === true,
    });

    await product.save();

    await AuditLog.create({
      userId,
      action: 'PRODUCT_CREATE',
      details: `Product created: ${product._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (req.io) {
      req.io.emit('productCreated', {
        product: product.toObject(),
        displayPrice: product.discountPrice || product.price,
      });
    }

    return ApiResponse.success(res, 201, 'Product created successfully', { product });
    
  } catch (error) {
    console.error('Create product error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = {
          message: error.errors[key].message,
          path: key,
        };
      });
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return next(new ApiError(400, 'Duplicate SKU detected'));
    }
    
    // Handle ApiError instances
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ 
        message: error.message, 
        errors: error.errors || [] 
      });
    }
    
    // Handle other errors
    return next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, 'User not authenticated'));
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(new ApiError(400, 'Invalid product ID'));
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new ApiError(404, 'Product not found'));
    }

    const { title, description, price, discountPrice, shippingCost, categoryId, brand, stock, specifications, features, variants, seo, isFeatured, color } = req.body;

    // Fixed discount price validation logic
    if (discountPrice !== undefined && discountPrice !== null && discountPrice !== '') {
      // Use the new price if provided, otherwise use the existing product price
      const currentPrice = price !== undefined ? parseFloat(price) : product.price;
      const currentDiscountPrice = parseFloat(discountPrice);
      
      if (isNaN(currentPrice) || isNaN(currentDiscountPrice)) {
        return next(new ApiError(400, 'Price and discount price must be valid numbers'));
      }
      
      if (currentDiscountPrice >= currentPrice) {
        return next(new ApiError(400, 'Discount price must be less than the base price'));
      }
    }

    // Parse color
    let parsedColor = color;
    if (typeof color === 'string') {
      try {
        parsedColor = JSON.parse(color);
      } catch (error) {
        return next(new ApiError(400, 'Invalid color format'));
      }
    }

    // Handle base images update
    if (req.files?.baseImages?.length > 0) {
      for (const image of product.images) {
        try {
          await cloudinary.uploader.destroy(image.public_id);
        } catch (cloudinaryError) {
          console.warn('Failed to delete old image:', cloudinaryError.message);
        }
      }
      product.images = req.files.baseImages.map(file => ({
        url: file.path,
        public_id: file.filename,
        alt: file.originalname,
      }));
    }

    // Handle base videos update
    if (req.files?.baseVideos?.length > 0) {
      for (const video of product.videos) {
        try {
          await cloudinary.uploader.destroy(video.public_id, { resource_type: 'video' });
        } catch (cloudinaryError) {
          console.warn('Failed to delete old video:', cloudinaryError.message);
        }
      }
      product.videos = req.files.baseVideos.map(file => ({
        url: file.path,
        public_id: file.filename,
        alt: file.originalname,
      }));
    } else {
      product.videos = product.videos || [];
    }

    // Handle variant files
    const variantImages = {};
    const variantVideos = {};
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (key.startsWith('variantImages[')) {
          const index = key.match(/\[(\d+)\]/)[1];
          variantImages[index] = req.files[key].map(file => ({
            url: file.path,
            public_id: file.filename,
            alt: file.originalname,
          }));
        } else if (key.startsWith('variantVideos[')) {
          const index = key.match(/\[(\d+)\]/)[1];
          variantVideos[index] = req.files[key].map(file => ({
            url: file.path,
            public_id: file.filename,
            alt: file.originalname,
          }));
        }
      });
    }

    // Handle variants
    let parsedVariants = variants;
    if (typeof variants === 'string') {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (error) {
        return next(new ApiError(400, 'Invalid variants format'));
      }
    }

    if (parsedVariants) {
      // Delete old variant media
      for (const variant of product.variants) {
        for (const image of variant.images || []) {
          try {
            await cloudinary.uploader.destroy(image.public_id);
          } catch (cloudinaryError) {
            console.warn('Failed to delete old variant image:', cloudinaryError.message);
          }
        }
        for (const video of variant.videos || []) {
          try {
            await cloudinary.uploader.destroy(video.public_id, { resource_type: 'video' });
          } catch (cloudinaryError) {
            console.warn('Failed to delete old variant video:', cloudinaryError.message);
          }
        }
      }

      // Process new variants with validation
      product.variants = parsedVariants.map((variant, index) => {
        if (variant.discountPrice !== undefined && variant.discountPrice !== null && variant.discountPrice !== '') {
          const variantPrice = parseFloat(variant.price);
          const variantDiscountPrice = parseFloat(variant.discountPrice);
          
          if (isNaN(variantPrice) || isNaN(variantDiscountPrice)) {
            throw new ApiError(400, `Variant ${index + 1} price and discount price must be valid numbers`);
          }
          
          if (variantDiscountPrice >= variantPrice) {
            throw new ApiError(400, `Variant ${index + 1} discount price must be less than variant price`);
          }
        }

        let parsedVariantSpecifications = variant.specifications;
        if (typeof variant.specifications === 'string') {
          try {
            parsedVariantSpecifications = JSON.parse(variant.specifications);
          } catch (error) {
            throw new ApiError(400, `Invalid specifications format for variant ${index + 1}`);
          }
        }

        let parsedVariantColor = variant.color;
        if (typeof variant.color === 'string') {
          try {
            parsedVariantColor = JSON.parse(variant.color);
          } catch (error) {
            throw new ApiError(400, `Invalid color format for variant ${index + 1}`);
          }
        }

        return {
          ...variant,
          color: parsedVariantColor,
          images: variantImages[index] || variant.images || [],
          videos: variantVideos[index] || variant.videos || [],
          specifications: parsedVariantSpecifications || [],
        };
      });
    }

    // Parse other JSON fields
    let parsedSeo = seo;
    if (typeof seo === 'string') {
      try {
        parsedSeo = JSON.parse(seo);
      } catch (error) {
        return next(new ApiError(400, 'Invalid SEO format'));
      }
    }

    let parsedSpecifications = specifications;
    if (typeof specifications === 'string') {
      try {
        parsedSpecifications = JSON.parse(specifications);
      } catch (error) {
        return next(new ApiError(400, 'Invalid specifications format'));
      }
    }

    let parsedFeatures = features;
    if (typeof features === 'string') {
      try {
        parsedFeatures = JSON.parse(features);
      } catch (error) {
        return next(new ApiError(400, 'Invalid features format'));
      }
    }

    // Update product fields
    if (title !== undefined) product.title = title;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = parseFloat(price);
    if (discountPrice !== undefined) {
      product.discountPrice = discountPrice === '' || discountPrice === null ? undefined : parseFloat(discountPrice);
    }
    if (shippingCost !== undefined) product.shippingCost = parseFloat(shippingCost);
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (brand !== undefined) product.brand = brand;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (parsedSpecifications !== undefined) product.specifications = parsedSpecifications;
    if (parsedFeatures !== undefined) product.features = parsedFeatures;
    if (parsedSeo !== undefined) product.seo = parsedSeo;
    if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (parsedColor !== undefined) product.color = parsedColor;

    await product.save();

    // Create audit log
    await AuditLog.create({
      userId,
      action: 'PRODUCT_UPDATE',
      details: `Product updated: ${product._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit socket event if available
    if (req.io) {
      req.io.emit('productUpdated', {
        product: product.toObject(),
        displayPrice: product.discountPrice || product.price,
      });
    }

    return ApiResponse.success(res, 200, 'Product updated successfully', { product });
    
  } catch (error) {
    console.error('Update product error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = {
          message: error.errors[key].message,
          path: key,
        };
      });
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate SKU detected' });
    }
    
    // Handle ApiError instances
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ 
        message: error.message, 
        errors: error.errors || [] 
      });
    }
    
    // Handle other errors
    return next(error);
  }
};

exports.getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, categoryId, minPrice, maxPrice, attributeKey, attributeValue, search, isFeatured, color } = req.query;

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
    if (color) {
      query['color.name'] = { $regex: color, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
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

    return ApiResponse.success(res, 200, 'Products retrieved successfully', {
      products,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(new ApiError(400, 'Invalid product ID'));
    }

    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name slug');

    if (!product) {
      return next(new ApiError(404, 'Product not found'));
    }

    return ApiResponse.success(res, 200, 'Product retrieved successfully', { product });
  } catch (error) {
    return next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, 'User not authenticated'));
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(new ApiError(400, 'Invalid product ID'));
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new ApiError(404, 'Product not found'));
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
      userId,
      action: 'PRODUCT_DELETE',
      details: `Product deleted: ${product._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (req.io) {
      req.io.emit('productDeleted', { productId: product._id });
    }

    return ApiResponse.success(res, 200, 'Product deleted successfully');
  } catch (error) {
    return next(error);
  }
};

exports.getAllProductsForCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, categoryId, minPrice, maxPrice, search, attributeKey, attributeValue, isFeatured, color } = req.query;

    const query = { stock: { $gt: 0 } };
    if (categoryId) query.categoryId = categoryId;
    if (minPrice || maxPrice) {
      query.$or = [
        { 
          price: {
            ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
            ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {}),
          },
          discountPrice: null,
        },
        {
          discountPrice: {
            ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
            ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {}),
          },
        },
      ];
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }
    if (attributeKey && attributeValue) {
      query['variants.attributes'] = { $elemMatch: { key: attributeKey, value: attributeValue } };
    }
    if (color) {
      query['color.name'] = { $regex: color, $options: 'i' };
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
      displayPrice: product.discountPrice || product.price,
    }));

    const total = await Product.countDocuments(query);

    return ApiResponse.success(res, 200, 'Products retrieved successfully', {
      products: productsWithDisplayPrice,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
};

exports.getProductDetailsForCustomers = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(new ApiError(400, 'Invalid product ID'));
    }

    const product = await Product.findById(req.params.id)
      .select('-__v')
      .populate('categoryId', 'name slug');

    if (!product) {
      return next(new ApiError(404, 'Product not found'));
    }

    if (product.stock <= 0 && product.variants.every(v => v.stock <= 0)) {
      return next(new ApiError(404, 'Product is out of stock'));
    }

    const productWithDisplayPrice = {
      ...product.toObject(),
      displayPrice: product.discountPrice || product.price,
      variants: product.variants.map(variant => ({
        ...variant,
        displayPrice: variant.discountPrice || variant.price,
      })),
    };

    return ApiResponse.success(res, 200, 'Product details retrieved successfully', { 
      product: productWithDisplayPrice,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, color } = req.query;

    const query = { isFeatured: true, stock: { $gt: 0 } };
    if (color) {
      query['color.name'] = { $regex: color, $options: 'i' };
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
      displayPrice: product.discountPrice || product.price,
    }));

    const total = await Product.countDocuments(query);

    return ApiResponse.success(res, 200, 'Featured products retrieved successfully', {
      products: productsWithDisplayPrice,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
};