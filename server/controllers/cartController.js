const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { v4: uuidv4 } = require('uuid');

exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { productId, variantId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    let stock;
    if (variantId) {
      const variant = product.variants.id(variantId);
      if (!variant) {
        throw new ApiError(404, 'Variant not found');
      }
      stock = variant.stock;
    } else {
      stock = product.stock;
    }

    if (stock < quantity) {
      throw new ApiError(400, `Insufficient stock for product: ${product.title}${variantId ? ' (variant)' : ''}`);
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      console.log(`Creating new cart for user ${userId}`);
      cart = new Cart({
        userId,
        items: [],
      });
    }

    const itemIndex = cart.items.findIndex(item =>
      item.productId.toString() === productId &&
      (item.variantId?.toString() === variantId || (!item.variantId && !variantId))
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = quantity;
    } else {
      cart.items.push({ productId, variantId, quantity });
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
      select: 'title price discountPrice shippingCost stock brand sku images variants',
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
          shippingCost: 0,
          image: '/placeholder-product.png',
          title: 'Product not available',
          sku: 'N/A',
          stock: 0,
          isUnavailable: true,
        };
      }

      let price = 0,
        shippingCost = product.shippingCost || 0,
        image = '/placeholder-product.png',
        stock = 0;
      if (item.variantId && product.variants) {
        const variant = product.variants.id(item.variantId);
        if (variant) {
          price = variant.discountPrice || variant.price || 0;
          image = variant.image || (product.images?.length > 0 ? product.images[0] : '/placeholder-product.png');
          stock = variant.stock || 0;
        } else {
          price = product.discountPrice || product.price || 0;
          image = product.images?.length > 0 ? product.images[0] : '/placeholder-product.png';
          stock = 0;
        }
      } else {
        price = product.discountPrice || product.price || 0;
        image = product.images?.length > 0 ? product.images[0] : '/placeholder-product.png';
        stock = product.stock || 0;
      }

      return {
        ...item.toObject(),
        price,
        shippingCost,
        image,
        title: product.title || 'Unnamed Product',
        sku: product.sku || 'N/A',
        stock,
        isVariantUnavailable: item.variantId && product.variants ? !product.variants.id(item.variantId) : false,
      };
    });

    // Filter out invalid items (where productId is null) before calculating totals
    const validItems = populatedItems.filter(item => !item.isUnavailable);

    const totalPrice = validItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalItems = validItems.reduce((sum, item) => sum + item.quantity, 0);
    // Calculate shipping cost per product (once per productId, regardless of quantity or variant)
    const uniqueProducts = new Set(
      validItems
        .filter(item => item.productId) // Ensure productId exists
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

exports.removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { productId, variantId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    cart.items = cart.items.filter(
      item =>
        !(
          item.productId.toString() === productId &&
          (item.variantId?.toString() === variantId || (!item.variantId && !variantId))
        )
    );
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

      let price, sku, stock;
      if (item.variantId) {
        const variant = product.variants?.id(item.variantId);
        if (!variant) {
          throw new ApiError(404, `Variant not found for product: ${product.title}`);
        }
        price = variant.discountPrice || variant.price || 0;
        sku = variant.sku || 'N/A';
        stock = variant.stock || 0;
      } else {
        price = product.discountPrice || product.price || 0;
        sku = product.sku || 'N/A';
        stock = product.stock || 0;
      }

      if (stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for product: ${product.title}${item.variantId ? ' (variant)' : ''}`);
      }

      totalPrice += price * item.quantity;
      if (!uniqueProducts.has(product._id.toString())) {
        totalShippingCost += product.shippingCost || 0;
        uniqueProducts.add(product._id.toString());
      }

      orderItems.push({
        productId: product._id,
        variantId: item.variantId,
        quantity: item.quantity,
        price,
        sku,
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

    for (const item of cart.items) {
      const product = item.productId;
      if (!product) {
        continue;
      }
      if (item.variantId) {
        const variant = product.variants?.id(item.variantId);
        if (variant) {
          variant.stock -= item.quantity;
        }
      } else {
        product.stock -= item.quantity;
      }
      await product.save();
    }

    cart.items = [];
    await cart.save();

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