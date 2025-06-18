const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// Add item to wishlist
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId, variantId, deviceId } = req.body;

    // Find product (relying on validator, but confirm existence)
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ deviceId });
    if (!wishlist) {
      wishlist = new Wishlist({ deviceId, items: [] });
    }

    // Check if item already in wishlist
    const itemExists = wishlist.items.some(item =>
      item.productId.toString() === productId &&
      (item.variantId?.toString() === variantId || (!item.variantId && !variantId))
    );
    
    if (itemExists) {
      throw new ApiError(400, 'Item already in wishlist');
    }

    // Add item
    wishlist.items.push({ 
      productId, 
      variantId: variantId || null, 
      addedAt: new Date() 
    });
    
    await wishlist.save();

    // Emit socket event
    try {
      const io = require('../server').io;
      if (io) {
        io.to(`device:${deviceId}`).emit('wishlistUpdated', { deviceId });
      }
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
    }

    return ApiResponse.success(res, 201, 'Item added to wishlist successfully', { 
      wishlist: {
        deviceId: wishlist.deviceId,
        itemCount: wishlist.items.length,
        items: wishlist.items
      }
    });
    
  } catch (error) {
    console.error('Add to wishlist error:', error);
    if (error.code === 11000) {
      return next(new ApiError(400, 'Item already in wishlist'));
    }
    next(error);
  }
};

// Get wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const { deviceId } = req.query;

    // Additional validation
    if (!deviceId?.trim()) {
      throw new ApiError(400, 'Valid device ID is required');
    }

    const wishlist = await Wishlist.findOne({ deviceId: deviceId.trim() })
      .populate({
        path: 'items.productId',
        select: 'title price discountPrice stock brand sku images variants isActive',
        match: { isActive: { $ne: false } } // Only get active products
      });

    if (!wishlist || !wishlist.items.length) {
      return ApiResponse.success(res, 200, 'Wishlist is empty', { 
        wishlist: {
          deviceId: deviceId.trim(),
          items: [],
          itemCount: 0
        }
      });
    }

    // Filter out items where product was not found (deleted products)
    wishlist.items = wishlist.items.filter(item => item.productId);

    // Save if any items were removed
    if (wishlist.items.length !== wishlist.items.length) {
      await wishlist.save();
    }

    return ApiResponse.success(res, 200, 'Wishlist retrieved successfully', { 
      wishlist: {
        deviceId: wishlist.deviceId,
        itemCount: wishlist.items.length,
        items: wishlist.items
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// Remove item from wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId, variantId } = req.params;
    const { deviceId } = req.body;

    // Additional validation
    if (!deviceId?.trim()) {
      throw new ApiError(400, 'Valid device ID is required');
    }

    const wishlist = await Wishlist.findOne({ deviceId: deviceId.trim() });
    if (!wishlist) {
      throw new ApiError(404, 'Wishlist not found');
    }

    const initialLength = wishlist.items.length;
    
    // Remove the item
    wishlist.items = wishlist.items.filter(item => {
      const productMatch = item.productId.toString() === productId;
      const variantMatch = variantId === 'undefined' || !variantId 
        ? !item.variantId 
        : item.variantId?.toString() === variantId;
      
      return !(productMatch && variantMatch);
    });

    // Check if any item was actually removed
    if (wishlist.items.length === initialLength) {
      throw new ApiError(404, 'Item not found in wishlist');
    }

    await wishlist.save();

    // Emit socket event (with error handling)
    try {
      const io = require('../server').io;
      if (io) {
        io.to(`device:${deviceId}`).emit('wishlistUpdated', { deviceId });
      }
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
      // Don't fail the request for socket errors
    }

    return ApiResponse.success(res, 200, 'Item removed from wishlist successfully', { 
      wishlist: {
        deviceId: wishlist.deviceId,
        itemCount: wishlist.items.length,
        items: wishlist.items
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// Clear entire wishlist
exports.clearWishlist = async (req, res, next) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId?.trim()) {
      throw new ApiError(400, 'Valid device ID is required');
    }

    const result = await Wishlist.findOneAndDelete({ deviceId: deviceId.trim() });
    
    if (!result) {
      throw new ApiError(404, 'Wishlist not found');
    }

    // Emit socket event
    try {
      const io = require('../server').io;
      if (io) {
        io.to(`device:${deviceId}`).emit('wishlistCleared', { deviceId });
      }
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
    }

    return ApiResponse.success(res, 200, 'Wishlist cleared successfully');
    
  } catch (error) {
    next(error);
  }
};