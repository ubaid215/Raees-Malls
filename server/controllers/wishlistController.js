const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// Add item to wishlist
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId, variantId } = req.body;
    const userId = req.user._id;

    // Validate product
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Validate variant if provided
    if (variantId) {
      const variant = product.variants.id(variantId);
      if (!variant) {
        throw new ApiError(404, 'Variant not found');
      }
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [] });
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
    wishlist.items.push({ productId, variantId, addedAt: new Date() });
    await wishlist.save();

    ApiResponse.success(res, 201, 'Item added to wishlist successfully', { wishlist });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, 'Item already in wishlist'));
    }
    next(error);
  }
};

// Get user's wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const wishlist = await Wishlist.findOne({ userId })
      .populate('items.productId', 'title price discountPrice stock brand sku images variants');

    if (!wishlist) {
      return ApiResponse.success(res, 200, 'Wishlist is empty', { wishlist: null });
    }

    ApiResponse.success(res, 200, 'Wishlist retrieved successfully', { wishlist });
  } catch (error) {
    next(error);
  }
};

// Remove item from wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId, variantId } = req.params;
    const userId = req.user._id;

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      throw new ApiError(404, 'Wishlist not found');
    }

    wishlist.items = wishlist.items.filter(item =>
      !(item.productId.toString() === productId &&
        (item.variantId?.toString() === variantId || (!item.variantId && !variantId)))
    );
    await wishlist.save();

    ApiResponse.success(res, 200, 'Item removed from wishlist successfully', { wishlist });
  } catch (error) {
    next(error);
  }
};