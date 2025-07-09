const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { v4: uuidv4 } = require('uuid');

// Helper function to find the right pricing and stock based on product structure
const getProductDetails = (product, variantColor = null, storageCapacity = null, size = null) => {
  let price = 0;
  let discountPrice = null;
  let stock = 0;
  let sku = product.sku;
  let images = product.images || [];
  let videos = product.videos || [];

  if (variantColor) {
    // Find the variant by color
    const variant = product.variants?.find(v => v.color?.name === variantColor);
    if (!variant) {
      throw new Error(`Variant with color "${variantColor}" not found`);
    }

    // Use variant images if available, otherwise fallback to product images
    images = variant.images && variant.images.length > 0 ? variant.images : images;
    videos = variant.videos && variant.videos.length > 0 ? variant.videos : videos;

    if (storageCapacity) {
      // Handle storage options within variant
      const storageOption = variant.storageOptions?.find(s => s.capacity === storageCapacity);
      if (!storageOption) {
        throw new Error(`Storage option "${storageCapacity}" not found in variant "${variantColor}"`);
      }
      price = storageOption.price;
      discountPrice = storageOption.discountPrice;
      stock = storageOption.stock;
      sku = storageOption.sku;
    } else if (size) {
      // Handle size options within variant
      const sizeOption = variant.sizeOptions?.find(s => s.size === size);
      if (!sizeOption) {
        throw new Error(`Size option "${size}" not found in variant "${variantColor}"`);
      }
      price = sizeOption.price;
      discountPrice = sizeOption.discountPrice;
      stock = sizeOption.stock;
      sku = sizeOption.sku;
    } else {
      // Simple color variant with direct pricing
      price = variant.price;
      discountPrice = variant.discountPrice;
      stock = variant.stock;
      sku = variant.sku;
    }
  } else {
    // Base product without variants
    price = product.price;
    discountPrice = product.discountPrice;
    stock = product.stock;
  }

  return {
    price: price || 0,
    discountPrice,
    stock: stock || 0,
    sku: sku || 'N/A',
    images,
    videos,
    finalPrice: discountPrice || price || 0
  };
};

exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { productId, variantColor, storageCapacity, size, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      throw new ApiError(400, 'Product ID and valid quantity are required');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Get product details based on variant configuration
    let productDetails;
    try {
      productDetails = getProductDetails(product, variantColor, storageCapacity, size);
    } catch (error) {
      throw new ApiError(404, error.message);
    }

    if (productDetails.stock < quantity) {
      throw new ApiError(400, `Insufficient stock. Available: ${productDetails.stock}, Requested: ${quantity}`);
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      console.log(`Creating new cart for user ${userId}`);
      cart = new Cart({
        userId,
        items: [],
      });
    }

    // Find existing item with same configuration
    const existingItem = cart.findItem(productId, variantColor, storageCapacity, size);

    if (existingItem) {
      // Update quantity of existing item
      const newQuantity = existingItem.quantity + quantity;
      if (productDetails.stock < newQuantity) {
        throw new ApiError(400, `Insufficient stock. Available: ${productDetails.stock}, Total requested: ${newQuantity}`);
      }
      existingItem.quantity = newQuantity;
    } else {
      // Add new item to cart
      const newItem = {
        productId,
        variantColor,
        storageCapacity,
        size,
        quantity,
        sku: productDetails.sku,
        priceAtAdd: productDetails.price,
        discountPriceAtAdd: productDetails.discountPrice
      };
      cart.items.push(newItem);
    }

    try {
      await cart.save();
      console.log(`Cart saved for user ${userId}: cartId=${cart.cartId}`);
    } catch (error) {
      console.error(`Error saving cart for user ${userId}:`, error);
      if (error.name === 'ValidationError') {
        throw new ApiError(400, `Cart validation failed: ${error.message}`);
      }
      throw error;
    }

    ApiResponse.success(res, 200, 'Item added to cart successfully', { cart });
  } catch (error) {
    next(error);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'title price discountPrice shippingCost stock brand sku images videos variants',
    });

    if (!cart) {
      return ApiResponse.success(res, 200, 'Cart is empty', { cart: null });
    }

    const populatedItems = cart.items.map(item => {
      const product = item.productId;
      if (!product) {
        return {
          ...item.toObject(),
          price: 0,
          finalPrice: 0,
          shippingCost: 0,
          image: null,
          images: [],
          videos: [],
          title: 'Product not available',
          sku: 'N/A',
          stock: 0,
          isUnavailable: true,
        };
      }

      let productDetails;
      try {
        productDetails = getProductDetails(
          product, 
          item.variantColor, 
          item.storageCapacity, 
          item.size
        );
      } catch (error) {
        console.error('Error getting product details:', error);
        return {
          ...item.toObject(),
          price: item.priceAtAdd || 0,
          finalPrice: item.discountPriceAtAdd || item.priceAtAdd || 0,
          shippingCost: product.shippingCost || 0,
          image: product.images?.[0] || null,
          images: product.images || [],
          videos: product.videos || [],
          title: product.title || 'Unnamed Product',
          sku: item.sku || 'N/A',
          stock: 0,
          isVariantUnavailable: true,
        };
      }

      // Use current price vs price at add (you can choose which to use)
      const currentPrice = productDetails.finalPrice;
      const priceAtAdd = item.discountPriceAtAdd || item.priceAtAdd || 0;

      return {
        ...item.toObject(),
        price: currentPrice,
        priceAtAdd,
        finalPrice: currentPrice,
        shippingCost: product.shippingCost || 0,
        image: productDetails.images?.[0] || null,
        images: productDetails.images || [],
        videos: productDetails.videos || [],
        title: product.title || 'Unnamed Product',
        brand: product.brand || 'Unknown Brand',
        sku: productDetails.sku,
        stock: productDetails.stock,
        isUnavailable: false,
        isVariantUnavailable: false,
        // Additional variant info for display
        variantInfo: {
          color: item.variantColor,
          storage: item.storageCapacity,
          size: item.size
        }
      };
    });

    // Filter out invalid items
    const validItems = populatedItems.filter(item => !item.isUnavailable);

    const totalPrice = validItems.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);
    const totalItems = validItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate shipping cost per unique product
    const uniqueProducts = new Set(
      validItems
        .filter(item => item.productId)
        .map(item => item.productId.toString())
    );
    
    const totalShippingCost = Array.from(uniqueProducts).reduce((sum, productId) => {
      const item = validItems.find(item => item.productId && item.productId.toString() === productId);
      return sum + (item?.shippingCost || 0);
    }, 0);

    const responseCart = {
      ...cart.toObject(),
      items: populatedItems,
      totalPrice,
      totalShippingCost: totalPrice >= 2500 || totalItems >= 2500 ? 0 : totalShippingCost,
      itemCount: totalItems,
    };

    ApiResponse.success(res, 200, 'Cart retrieved successfully', { cart: responseCart });
  } catch (error) {
    next(error);
  }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { productId, variantColor, storageCapacity, size, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      throw new ApiError(400, 'Product ID and valid quantity are required');
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    const existingItem = cart.findItem(productId, variantColor, storageCapacity, size);
    if (!existingItem) {
      throw new ApiError(404, 'Item not found in cart');
    }

    // Check stock availability
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    const productDetails = getProductDetails(product, variantColor, storageCapacity, size);
    if (productDetails.stock < quantity) {
      throw new ApiError(400, `Insufficient stock. Available: ${productDetails.stock}, Requested: ${quantity}`);
    }

    existingItem.quantity = quantity;
    await cart.save();

    ApiResponse.success(res, 200, 'Cart item updated successfully', { cart });
  } catch (error) {
    next(error);
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { productId, variantColor, storageCapacity, size } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(item => {
      return !(
        item.productId.toString() === productId &&
        item.variantColor === variantColor &&
        item.storageCapacity === storageCapacity &&
        item.size === size
      );
    });

    if (cart.items.length === initialLength) {
      throw new ApiError(404, 'Item not found in cart');
    }

    await cart.save();

    ApiResponse.success(res, 200, 'Item removed from cart successfully', { cart });
  } catch (error) {
    next(error);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    cart.items = [];
    await cart.save();

    ApiResponse.success(res, 200, 'Cart cleared successfully', { cart });
  } catch (error) {
    next(error);
  }
};

exports.placeOrderFromCart = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { shippingAddress } = req.body;

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty');
    }

    let totalPrice = 0;
    let totalShippingCost = 0;
    const orderItems = [];
    const uniqueProducts = new Set();

    for (const item of cart.items) {
      const product = item.productId;
      if (!product) {
        continue;
      }

      let productDetails;
      try {
        productDetails = getProductDetails(
          product, 
          item.variantColor, 
          item.storageCapacity, 
          item.size
        );
      } catch (error) {
        throw new ApiError(404, `Product configuration error: ${error.message}`);
      }

      if (productDetails.stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.title}. Available: ${productDetails.stock}, Requested: ${item.quantity}`);
      }

      totalPrice += productDetails.finalPrice * item.quantity;
      
      if (!uniqueProducts.has(product._id.toString())) {
        totalShippingCost += product.shippingCost || 0;
        uniqueProducts.add(product._id.toString());
      }

      orderItems.push({
        productId: product._id,
        variantColor: item.variantColor,
        storageCapacity: item.storageCapacity,
        size: item.size,
        quantity: item.quantity,
        price: productDetails.finalPrice,
        sku: productDetails.sku,
      });
    }

    if (orderItems.length === 0) {
      throw new ApiError(400, 'No valid items in cart to place order');
    }

    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    totalShippingCost = totalPrice >= 2500 || totalItems >= 2500 ? 0 : totalShippingCost;

    const order = new Order({
      orderId: `ORD-${uuidv4().split('-')[0]}`,
      userId,
      items: orderItems,
      totalPrice,
      totalShippingCost,
      shippingAddress,
      status: 'pending',
    });

    await order.save();

    // Update stock levels
    for (const item of cart.items) {
      const product = item.productId;
      if (!product) continue;

      if (item.variantColor) {
        const variant = product.variants?.find(v => v.color?.name === item.variantColor);
        if (variant) {
          if (item.storageCapacity) {
            const storageOption = variant.storageOptions?.find(s => s.capacity === item.storageCapacity);
            if (storageOption) {
              storageOption.stock -= item.quantity;
            }
          } else if (item.size) {
            const sizeOption = variant.sizeOptions?.find(s => s.size === item.size);
            if (sizeOption) {
              sizeOption.stock -= item.quantity;
            }
          } else {
            variant.stock -= item.quantity;
          }
        }
      } else {
        product.stock -= item.quantity;
      }
      await product.save();
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // Emit socket event for new order
    const io = req.app.get('socketio');
    if (io) {
      io.to('adminRoom').emit('newOrder', {
        orderId: order.orderId,
        userId: order.userId,
        totalPrice: order.totalPrice,
        totalShippingCost: order.totalShippingCost,
        createdAt: order.createdAt,
      });
    }

    ApiResponse.success(res, 201, 'Order placed successfully from cart', { order });
  } catch (error) {
    next(error);
  }
};