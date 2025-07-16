const mongoose = require('mongoose');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const cloudinary = require('../config/cloudinary');

exports.createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }

    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, 'User not authenticated'));
    }

    // Helper function to parse JSON fields
    const parseJsonField = (value) => {
      if (typeof value === 'string' && value) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    };

    // Extract fields from request
    const {
      title, description, price, categoryId, stock, discountPrice, shippingCost,
      brand, specifications, features, variants, seo, isFeatured, color
    } = req.body;

    // Parse complex fields
    const parsedVariants = variants ? parseJsonField(variants) : [];
    const parsedColor = color ? parseJsonField(color) : undefined;
    const parsedSeo = seo ? parseJsonField(seo) : {};
    const parsedSpecifications = specifications ? parseJsonField(specifications) : [];
    const parsedFeatures = features ? parseJsonField(features) : [];

    // Validate product must have either base pricing or variants
    const hasBasePricing = price !== undefined && price !== null && stock !== undefined && stock !== null;
    const hasVariants = Array.isArray(parsedVariants) && parsedVariants.length > 0;

    if (!hasBasePricing && !hasVariants) {
      return next(new ApiError(400, 'Product must have either base price/stock or variants'));
    }

    if (hasBasePricing && hasVariants) {
      return next(new ApiError(400, 'Product cannot have both base pricing and variants'));
    }

    // Validate discount price logic for base pricing
    if (hasBasePricing && discountPrice !== undefined && discountPrice !== null) {
      const basePrice = parseFloat(price);
      const baseDiscountPrice = parseFloat(discountPrice);
      if (baseDiscountPrice >= basePrice) {
        return next(new ApiError(400, 'Base discount price must be less than base price'));
      }
    }

    // Process media uploads
    const processMediaFiles = (files) => {
      return files?.map(file => ({
        url: file.path,
        public_id: file.filename,
        alt: file.originalname
      })) || [];
    };

    // Base product media
    const images = processMediaFiles(req.files?.baseImages);
    const videos = processMediaFiles(req.files?.baseVideos);

    // Process variant media
    const variantImages = {};
    const variantVideos = {};

    if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (key.startsWith('variantImages[')) {
          const match = key.match(/\[(\d+)\]/);
          if (match) {
            const index = match[1];
            variantImages[index] = processMediaFiles(req.files[key]);
          }
        } else if (key.startsWith('variantVideos[')) {
          const match = key.match(/\[(\d+)\]/);
          if (match) {
            const index = match[1];
            variantVideos[index] = processMediaFiles(req.files[key]);
          }
        }
      });
    }

    // Helper functions for validation
    const validateRequiredField = (value, fieldName) => {
      if (value === undefined || value === null || value === '') {
        throw new ApiError(400, `${fieldName} is required`);
      }
    };

    const validateNumericField = (value, fieldName, min = 0) => {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < min) {
        throw new ApiError(400, `${fieldName} must be a valid number >= ${min}`);
      }
      return numValue;
    };

    const validateIntegerField = (value, fieldName, min = 0) => {
      const intValue = parseInt(value);
      if (isNaN(intValue) || intValue < min) {
        throw new ApiError(400, `${fieldName} must be a valid integer >= ${min}`);
      }
      return intValue;
    };

    // Process variants with comprehensive validation
    const processedVariants = parsedVariants.map((variant, index) => {
      // Validate color is provided
      if (!variant.color || (!variant.color.name && typeof variant.color !== 'string')) {
        throw new ApiError(400, `Variant ${index + 1}: Color is required`);
      }

      const newVariant = {
        color: typeof variant.color === 'string' ? { name: variant.color } : variant.color,
        images: variantImages[index] || [],
        videos: variantVideos[index] || []
      };

      // FIXED: Better logic for detecting variant types
      // Check if storage options exist and are valid
      const hasStorageOptions = variant.storageOptions && 
        Array.isArray(variant.storageOptions) && 
        variant.storageOptions.length > 0;
      
      // Check if size options exist and are valid
      const hasSizeOptions = variant.sizeOptions && 
        Array.isArray(variant.sizeOptions) && 
        variant.sizeOptions.length > 0;

      // Check if direct pricing is intended (not just having default 0 values)
      // Direct pricing is intended if:
      // 1. Either price or stock is explicitly provided (not 0 or undefined)
      // 2. AND there are no storage/size options
      const hasDirectPricing = !hasStorageOptions && 
        !hasSizeOptions && 
        (
          (variant.price !== undefined && variant.price !== null && variant.price > 0) ||
          (variant.stock !== undefined && variant.stock !== null && variant.stock > 0) ||
          (variant.price !== undefined && variant.stock !== undefined && 
           typeof variant.price === 'number' && typeof variant.stock === 'number')
        );

      // Count variant types
      const variantTypesCount = [hasDirectPricing, hasStorageOptions, hasSizeOptions].filter(Boolean).length;

      // Must have exactly one variant type
      if (variantTypesCount === 0) {
        throw new ApiError(400, `Variant ${index + 1}: Must have either direct pricing, storage options, or size options`);
      }
      if (variantTypesCount > 1) {
        throw new ApiError(400, `Variant ${index + 1}: Cannot have multiple variant types (direct pricing, storage options, and size options are mutually exclusive)`);
      }

      // Simple color variant with direct pricing
      if (hasDirectPricing) {
        const variantPrice = validateNumericField(variant.price, `Variant ${index + 1} price`);
        const variantStock = validateIntegerField(variant.stock, `Variant ${index + 1} stock`);
        
        // Validate discount price if provided
        let variantDiscountPrice;
        if (variant.discountPrice !== undefined && variant.discountPrice !== null && variant.discountPrice !== '') {
          variantDiscountPrice = validateNumericField(variant.discountPrice, `Variant ${index + 1} discount price`);
          if (variantDiscountPrice >= variantPrice) {
            throw new ApiError(400, `Variant ${index + 1}: Discount price must be less than variant price`);
          }
        }

        return {
          ...newVariant,
          price: variantPrice,
          discountPrice: variantDiscountPrice,
          stock: variantStock,
          sku: variant.sku?.toUpperCase().trim()
        };
      }

      // Storage options variant
      if (hasStorageOptions) {
        const validatedStorageOptions = variant.storageOptions.map((opt, optIndex) => {
          validateRequiredField(opt.capacity, `Variant ${index + 1}, Storage option ${optIndex + 1}: Capacity`);
          
          const optPrice = validateNumericField(opt.price, `Variant ${index + 1}, Storage option ${optIndex + 1}: Price`);
          const optStock = validateIntegerField(opt.stock, `Variant ${index + 1}, Storage option ${optIndex + 1}: Stock`);
          
          // Validate discount price if provided
          let optDiscountPrice;
          if (opt.discountPrice !== undefined && opt.discountPrice !== null && opt.discountPrice !== '') {
            optDiscountPrice = validateNumericField(opt.discountPrice, `Variant ${index + 1}, Storage option ${optIndex + 1}: Discount price`);
            if (optDiscountPrice >= optPrice) {
              throw new ApiError(400, `Variant ${index + 1}, Storage option ${optIndex + 1}: Discount price must be less than option price`);
            }
          }

          return {
            capacity: opt.capacity.trim(),
            price: optPrice,
            discountPrice: optDiscountPrice,
            stock: optStock,
            sku: opt.sku?.toUpperCase().trim()
          };
        });

        return {
          ...newVariant,
          storageOptions: validatedStorageOptions
        };
      }

      // Size options variant
      if (hasSizeOptions) {
        const validatedSizeOptions = variant.sizeOptions.map((opt, optIndex) => {
          validateRequiredField(opt.size, `Variant ${index + 1}, Size option ${optIndex + 1}: Size`);
          
          const optPrice = validateNumericField(opt.price, `Variant ${index + 1}, Size option ${optIndex + 1}: Price`);
          const optStock = validateIntegerField(opt.stock, `Variant ${index + 1}, Size option ${optIndex + 1}: Stock`);
          
          // Validate discount price if provided
          let optDiscountPrice;
          if (opt.discountPrice !== undefined && opt.discountPrice !== null && opt.discountPrice !== '') {
            optDiscountPrice = validateNumericField(opt.discountPrice, `Variant ${index + 1}, Size option ${optIndex + 1}: Discount price`);
            if (optDiscountPrice >= optPrice) {
              throw new ApiError(400, `Variant ${index + 1}, Size option ${optIndex + 1}: Discount price must be less than option price`);
            }
          }

          return {
            size: opt.size.toString().toUpperCase().trim(),
            price: optPrice,
            discountPrice: optDiscountPrice,
            stock: optStock,
            sku: opt.sku?.toUpperCase().trim()
          };
        });

        return {
          ...newVariant,
          sizeOptions: validatedSizeOptions
        };
      }
    });

    // Validate at least one image exists
    if (hasVariants) {
      const hasVariantImages = processedVariants.some(v => v.images.length > 0);
      if (!hasVariantImages && images.length === 0) {
        return next(new ApiError(400, 'Products with variants must have at least one variant image or base image'));
      }
    } else if (images.length === 0) {
      return next(new ApiError(400, 'Products without variants must have at least one base image'));
    }

    // Prepare product data
    const productData = {
      title,
      description,
      shippingCost: shippingCost ? parseFloat(shippingCost) : 0,
      color: parsedColor,
      images,
      videos,
      categoryId,
      brand,
      specifications: parsedSpecifications,
      features: parsedFeatures,
      variants: processedVariants,
      seo: parsedSeo,
      isFeatured: isFeatured === 'true' || isFeatured === true,
    };

    // Add base pricing if present
    if (hasBasePricing) {
      productData.price = parseFloat(price);
      productData.stock = parseInt(stock);
      if (discountPrice !== undefined && discountPrice !== null && discountPrice !== '') {
        productData.discountPrice = parseFloat(discountPrice);
      }
    }

    // Create the product
    const product = new Product(productData);
    await product.save();

    // Log the action
    await AuditLog.create({
      userId,
      action: 'PRODUCT_CREATE',
      details: `Product created: ${product._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Notify via socket if available
    if (req.io) {
      // Calculate display price for socket notification
      let displayPrice = null;
      if (product.price !== undefined) {
        displayPrice = product.discountPrice || product.price;
      } else if (product.variants.length > 0) {
        // Find the lowest price from variants
        const prices = [];
        product.variants.forEach(variant => {
          if (variant.price !== undefined) {
            prices.push(variant.discountPrice || variant.price);
          }
          if (variant.storageOptions) {
            variant.storageOptions.forEach(opt => {
              prices.push(opt.discountPrice || opt.price);
            });
          }
          if (variant.sizeOptions) {
            variant.sizeOptions.forEach(opt => {
              prices.push(opt.discountPrice || opt.price);
            });
          }
        });
        if (prices.length > 0) {
          displayPrice = Math.min(...prices);
        }
      }

      req.io.emit('productCreated', {
        product: product.toObject(),
        displayPrice,
      });
    }

    return ApiResponse.success(res, 201, 'Product created successfully', { product });
  } catch (error) {
    console.error('Create product error:', error);
    
    // Handle custom ApiError instances
    if (error instanceof ApiError) {
      return next(error);
    }
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return next(new ApiError(400, 'Validation failed', errors));
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return next(new ApiError(400, `Duplicate ${duplicateField} detected`));
    }
    
    return next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('UpdateProduct: Validation errors:', JSON.stringify(errors.array(), null, 2));
      return next(new ApiError(400, 'Validation failed', errors.array()));
    }

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

    const parseJsonField = (value) => {
      if (typeof value === 'string' && value) {
        try {
          return JSON.parse(value);
        } catch (error) {
          console.warn(`Failed to parse JSON field: ${error.message}`);
          return value;
        }
      }
      return value;
    };

    const {
      title, description, price, discountPrice, shippingCost, categoryId, brand,
      stock, specifications, features, variants, seo, isFeatured, color,
      removeBaseImages, imagesToKeep, imagesToDelete, variantImagesToDelete
    } = req.body;

    const shouldRemoveBaseImages = String(removeBaseImages).toLowerCase() === 'true';

    const parsedVariants = parseJsonField(variants);
    const parsedColor = parseJsonField(color);
    const parsedSeo = parseJsonField(seo);
    const parsedSpecifications = parseJsonField(specifications);
    const parsedFeatures = parseJsonField(features);
    const parsedImagesToKeep = parseJsonField(imagesToKeep);
    const parsedImagesToDelete = parseJsonField(imagesToDelete);
    const parsedVariantImagesToDelete = parseJsonField(variantImagesToDelete) || [];

    const hasBasePricing = price !== undefined && stock !== undefined;
    const existingHasBasePricing = product.price !== undefined && product.stock !== undefined;
    const hasVariants = parsedVariants && Array.isArray(parsedVariants) && parsedVariants.length > 0;
    const existingHasVariants = product.variants && product.variants.length > 0;

    if (!hasBasePricing && !hasVariants && !existingHasBasePricing && !existingHasVariants) {
      return next(new ApiError(400, 'Product must have either base price/stock or variants'));
    }

    const processMediaFiles = (files) => {
      return files?.map(file => ({
        url: file.path,
        public_id: file.filename,
        alt: file.originalname
      })) || [];
    };

    // Handle base image deletions
    if (parsedImagesToDelete && Array.isArray(parsedImagesToDelete) && parsedImagesToDelete.length > 0) {
      const imagesToDeleteFromCloudinary = product.images.filter(img =>
        parsedImagesToDelete.includes(img._id.toString())
      );

      const deletionResults = await Promise.all(
        imagesToDeleteFromCloudinary.map(img =>
          cloudinary.uploader.destroy(img.public_id)
            .then(result => ({ public_id: img.public_id, status: 'success', result }))
            .catch(err => ({ public_id: img.public_id, status: 'error', error: err.message }))
        )
      );

      product.images = product.images.filter(img =>
        !parsedImagesToDelete.includes(img._id.toString())
      );
      product.markModified('images');
    }

    // Handle base images to keep
    if (parsedImagesToKeep && Array.isArray(parsedImagesToKeep) && parsedImagesToKeep.length > 0) {
      const imagesToDeleteFromCloudinary = product.images.filter(img =>
        !parsedImagesToKeep.includes(img._id.toString())
      );

      const deletionResults = await Promise.all(
        imagesToDeleteFromCloudinary.map(img =>
          cloudinary.uploader.destroy(img.public_id)
            .then(result => ({ public_id: img.public_id, status: 'success', result }))
            .catch(err => ({ public_id: img.public_id, status: 'error', error: err.message }))
        )
      );

      product.images = product.images.filter(img =>
        parsedImagesToKeep.includes(img._id.toString())
      );
      product.markModified('images');
    }

    // Handle new base images or complete base image removal
    if (req.files?.baseImages?.length > 0) {
      if (!parsedImagesToKeep && !parsedImagesToDelete) {
        const deletionResults = await Promise.all(
          product.images.map(img =>
            cloudinary.uploader.destroy(img.public_id)
              .then(result => ({ public_id: img.public_id, status: 'success', result }))
              .catch(err => ({ public_id: img.public_id, status: 'error', error: err.message }))
          )
        );
        product.images = processMediaFiles(req.files.baseImages);
      } else {
        const newImages = processMediaFiles(req.files.baseImages);
        product.images = [...product.images, ...newImages];
      }
      product.markModified('images');
    } else if (shouldRemoveBaseImages) {
      const deletionResults = await Promise.all(
        product.images.map(img =>
          cloudinary.uploader.destroy(img.public_id)
            .then(result => ({ public_id: img.public_id, status: 'success', result }))
            .catch(err => ({ public_id: img.public_id, status: 'error', error: err.message }))
          )
        );
      product.images = [];
      product.markModified('images');
    }

    // Process variant images and videos from uploaded files
    const variantImages = {};
    const variantVideos = {};

    if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (key.startsWith('variantImages[')) {
          const match = key.match(/\[(\d+)\]/);
          if (match) {
            const index = match[1];
            variantImages[index] = processMediaFiles(req.files[key]);
          }
        } else if (key.startsWith('variantVideos[')) {
          const match = key.match(/\[(\d+)\]/);
          if (match) {
            const index = match[1];
            variantVideos[index] = processMediaFiles(req.files[key]);
          }
        }
      });
    }

    // Process variants
    if (parsedVariants !== undefined && Array.isArray(parsedVariants)) {
      const processedVariants = await Promise.all(parsedVariants.map(async (variant, index) => {
        const existingVariant = product.variants[index] || {};
        let variantImagesArray = variant.images && Array.isArray(variant.images) ? variant.images
          : existingVariant.images || [];

        // Handle variant image deletions
        if (parsedVariantImagesToDelete[index]?.length > 0) {
          const imagesToDeleteFromCloudinary = variantImagesArray.filter(img =>
            parsedVariantImagesToDelete[index].includes(img._id?.toString())
          );

          const deletionResults = await Promise.all(
            imagesToDeleteFromCloudinary.map(img =>
              cloudinary.uploader.destroy(img.public_id)
                .then(result => ({ public_id: img.public_id, status: 'success', result }))
                .catch(err => ({ public_id: img.public_id, status: 'error', error: err.message }))
            )
          );

          variantImagesArray = variantImagesArray.filter(img =>
            !parsedVariantImagesToDelete[index].includes(img._id?.toString())
          );
        }

        const newVariant = {
          color: typeof variant.color === 'string'
            ? { name: variant.color.trim() }
            : variant.color || existingVariant.color || { name: '' },
          images: variantImagesArray,
          videos: variant.videos && Array.isArray(variant.videos)
            ? variant.videos
            : existingVariant.videos || []
        };

        const hasStorageOptions = variant.storageOptions &&
          Array.isArray(variant.storageOptions) &&
          variant.storageOptions.length > 0;

        const hasSizeOptions = variant.sizeOptions &&
          Array.isArray(variant.sizeOptions) &&
          variant.sizeOptions.length > 0;

        const hasDirectPricing = !hasStorageOptions &&
          !hasSizeOptions &&
          (
            (variant.price !== undefined && variant.price !== null && parseFloat(variant.price) > 0) ||
            (variant.stock !== undefined && variant.stock !== null && parseInt(variant.stock) >= 0) ||
            (variant.price !== undefined && variant.stock !== undefined &&
             typeof parseFloat(variant.price) === 'number' && typeof parseInt(variant.stock) === 'number')
          );

        if (hasDirectPricing) {
          newVariant.price = parseFloat(variant.price) || 0;
          newVariant.discountPrice = variant.discountPrice
            ? parseFloat(variant.discountPrice)
            : undefined;
          newVariant.stock = parseInt(variant.stock) || 0;
          newVariant.sku = variant.sku?.toUpperCase().trim() || undefined;
        }

        if (hasStorageOptions) {
          newVariant.storageOptions = variant.storageOptions.map(opt => ({
            capacity: opt.capacity?.trim() || '',
            price: parseFloat(opt.price) || 0,
            discountPrice: opt.discountPrice ? parseFloat(opt.discountPrice) : undefined,
            stock: parseInt(opt.stock) || 0,
            sku: opt.sku?.toUpperCase().trim() || undefined
          }));
        }

        if (hasSizeOptions) {
          newVariant.sizeOptions = variant.sizeOptions.map(opt => ({
            size: opt.size?.toString().toUpperCase().trim() || '',
            price: parseFloat(opt.price) || 0,
            discountPrice: opt.discountPrice ? parseFloat(opt.discountPrice) : undefined,
            stock: parseInt(opt.stock) || 0,
            sku: opt.sku?.toUpperCase().trim() || undefined
          }));
        }

        // Append new variant images if uploaded
        if (variantImages[index]) {
          newVariant.images = [...variantImagesArray, ...variantImages[index]];
        }

        // Append new variant videos if uploaded
        if (variantVideos[index]) {
          newVariant.videos = [...newVariant.videos, ...variantVideos[index]];
        }

        return newVariant;
      }));

      product.variants = processedVariants;
      product.markModified('variants');
    }

    // Update other product fields
    if (title !== undefined) product.title = title;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = parseFloat(price);
    if (discountPrice !== undefined) {
      product.discountPrice = discountPrice === '' ? undefined : parseFloat(discountPrice);
    }
    if (shippingCost !== undefined) product.shippingCost = parseFloat(shippingCost);
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (brand !== undefined) product.brand = brand;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (parsedSpecifications !== undefined) product.specifications = parsedSpecifications;
    if (parsedFeatures !== undefined) product.features = parsedFeatures;
    if (parsedSeo !== undefined) product.seo = parsedSeo;
    if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (req.body.color !== undefined) {
      product.color = parsedColor;
    }

    await product.save();

    await AuditLog.create({
      userId,
      action: 'PRODUCT_UPDATE',
      details: `Product updated: ${product._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (req.io) {
      req.io.emit('productUpdated', {
        product: product.toObject(),
        displayPrice: product.discountPrice || product.price,
      });
    }

    return ApiResponse.success(res, 200, 'Product updated successfully', { product });
  } catch (error) {
    console.error('UpdateProduct: Error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return next(new ApiError(400, 'Validation failed', errors));
    }
    if (error.code === 11000) {
      return next(new ApiError(400, 'Duplicate SKU detected'));
    }
    return next(error);
  }
};

exports.getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, categoryId, minPrice, maxPrice, search, isFeatured, color } = req.query;

    const query = {};
    const conditions = [];

    // Stock availability check
    conditions.push({
      $or: [
        { stock: { $gt: 0 } },
        { 'variants.storageOptions.stock': { $gt: 0 } },
        { 'variants.sizeOptions.stock': { $gt: 0 } },
      ]
    });

    if (categoryId) query.categoryId = categoryId;

    if (minPrice || maxPrice) {
      conditions.push({
        $or: [
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
          {
            'variants.storageOptions.price': {
              ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
              ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {}),
            },
            'variants.storageOptions.discountPrice': null,
          },
          {
            'variants.storageOptions.discountPrice': {
              ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
              ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {}),
            },
          },
          {
            'variants.sizeOptions.price': {
              ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
              ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {}),
            },
            'variants.sizeOptions.discountPrice': null,
          },
          {
            'variants.sizeOptions.discountPrice': {
              ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
              ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {}),
            },
          },
        ]
      });
    }

    if (color) {
      conditions.push({
        $or: [
          { 'color.name': { $regex: color, $options: 'i' } },
          { 'variants.color.name': { $regex: color, $options: 'i' } }
        ]
      });
    }

    if (search) {
      conditions.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { 'variants.storageOptions.sku': { $regex: search, $options: 'i' } },
          { 'variants.sizeOptions.sku': { $regex: search, $options: 'i' } },
        ]
      });
    }

    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === 'true';
    }

    if (conditions.length > 0) {
      query.$and = conditions;
    }

    const sortOption = sort || '-createdAt';
    const skip = (parseInt(page) - 1) * parseInt(limit);

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

    for (const image of product.images || []) {
      await cloudinary.uploader.destroy(image.public_id);
    }
    for (const video of product.videos || []) {
      await cloudinary.uploader.destroy(video.public_id, { resource_type: 'video' });
    }

    for (const variant of product.variants) {
      for (const image of variant.images || []) {
        await cloudinary.uploader.destroy(image.public_id);
      }
      for (const video of variant.videos || []) {
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
    const { page = 1, limit = 10, sort, categoryId, minPrice, maxPrice, search, isFeatured, color } = req.query;

    const query = {};
    const conditions = [];

    // Stock availability check
    conditions.push({
      $or: [
        { stock: { $gt: 0 } },
        { 'variants.storageOptions.stock': { $gt: 0 } },
        { 'variants.sizeOptions.stock': { $gt: 0 } },
      ]
    });

    if (categoryId) query.categoryId = categoryId;

    if (minPrice || maxPrice) {
      conditions.push({
        $or: [
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
          {
            'variants.storageOptions.price': {
              ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
              ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {}),
            },
            'variants.storageOptions.discountPrice': null,
          },
          {
            'variants.storageOptions.discountPrice': {
              ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
              ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {}),
            },
          },
          {
            'variants.sizeOptions.price': {
              ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
              ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {}),
            },
            'variants.sizeOptions.discountPrice': null,
          },
          {
            'variants.sizeOptions.discountPrice': {
              ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
              ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {}),
            },
          },
        ]
      });
    }

    if (color) {
      conditions.push({
        $or: [
          { 'color.name': { $regex: color, $options: 'i' } },
          { 'variants.color.name': { $regex: color, $options: 'i' } }
        ]
      });
    }

    if (search) {
      conditions.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { 'variants.storageOptions.sku': { $regex: search, $options: 'i' } },
          { 'variants.sizeOptions.sku': { $regex: search, $options: 'i' } },
        ]
      });
    }

    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === 'true';
    }

    if (conditions.length > 0) {
      query.$and = conditions;
    }

    const sortOption = sort || '-createdAt';
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(query)
      .select('-__v')
      .populate('categoryId', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const productsWithDisplayPrice = products.map(product => {
      const productObj = product.toObject();
      return {
        ...productObj,
        displayPrice: product.discountPrice || product.price,
        variants: productObj.variants.map(variant => ({
          ...variant,
          storageOptions: variant.storageOptions?.map(option => ({
            ...option,
            displayPrice: option.discountPrice || option.price
          })) || [],
          sizeOptions: variant.sizeOptions?.map(option => ({
            ...option,
            displayPrice: option.discountPrice || option.price
          })) || []
        }))
      };
    });

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

    const product = await Product.findOne({
      _id: req.params.id,
      $or: [
        { stock: { $gt: 0 } },
        { 'variants.storageOptions.stock': { $gt: 0 } },
        { 'variants.sizeOptions.stock': { $gt: 0 } },
      ]
    })
      .select('-__v')
      .populate('categoryId', 'name slug');

    if (!product) {
      return next(new ApiError(404, 'Product not found or out of stock'));
    }

    const productWithDisplayPrice = {
      ...product.toObject(),
      displayPrice: product.discountPrice || product.price,
      variants: product.variants.map(variant => ({
        ...variant,
        storageOptions: variant.storageOptions?.map(option => ({
          ...option,
          displayPrice: option.discountPrice || option.price
        })) || [],
        sizeOptions: variant.sizeOptions?.map(option => ({
          ...option,
          displayPrice: option.discountPrice || option.price
        })) || []
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

    const query = {
      isFeatured: true
    };
    const conditions = [];

    // Stock availability check
    conditions.push({
      $or: [
        { stock: { $gt: 0 } },
        { 'variants.storageOptions.stock': { $gt: 0 } },
        { 'variants.sizeOptions.stock': { $gt: 0 } },
      ]
    });

    if (color) {
      conditions.push({
        $or: [
          { 'color.name': { $regex: color, $options: 'i' } },
          { 'variants.color.name': { $regex: color, $options: 'i' } }
        ]
      });
    }

    if (conditions.length > 0) {
      query.$and = conditions;
    }

    const sortOption = sort || '-createdAt';
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(query)
      .select('-__v')
      .populate('categoryId', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const productsWithDisplayPrice = products.map(product => {
      const productObj = product.toObject();
      return {
        ...productObj,
        displayPrice: product.discountPrice || product.price,
        variants: productObj.variants.map(variant => ({
          ...variant,
          storageOptions: variant.storageOptions?.map(option => ({
            ...option,
            displayPrice: option.discountPrice || option.price
          })) || [],
          sizeOptions: variant.sizeOptions?.map(option => ({
            ...option,
            displayPrice: option.discountPrice || option.price
          })) || []
        }))
      };
    });

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
