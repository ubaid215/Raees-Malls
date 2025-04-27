const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { v4: uuidv4 } = require('uuid');

// Add or update item in cart
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const userId = req.user._id;

    // Validate product
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Validate variant if provided
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

    // Check stock
    if (stock < quantity) {
      throw new ApiError(400, `Insufficient stock for product: ${product.title}${variantId ? ' (variant)' : ''}`);
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        cartId: `CART-${uuidv4().split('-')[0]}`,
        userId,
        items: []
      });
    }

    // Check if product/variant already in cart
    const itemIndex = cart.items.findIndex(item => 
      item.productId.toString() === productId && 
      (item.variantId?.toString() === variantId || (!item.variantId && !variantId))
    );
    if (itemIndex > -1) {
      // Update quantity
      cart.items[itemIndex].quantity = quantity;
    } else {
      // Add new item
      cart.items.push({ productId, variantId, quantity });
    }

    await cart.save();

    ApiResponse.success(res, 200, 'Item added to cart successfully', { cart });
  } catch (error) {
    next(error);
  }
};

// Get user's cart
exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId })
      .populate('items.productId', 'title price discountPrice stock brand sku images variants');

    if (!cart) {
      return ApiResponse.success(res, 200, 'Cart is empty', { cart: null });
    }

    ApiResponse.success(res, 200, 'Cart retrieved successfully', { cart });
  } catch (error) {
    next(error);
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res, next) => {
  try {
    const { productId, variantId } = req.params;
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    cart.items = cart.items.filter(item => 
      !(item.productId.toString() === productId && 
        (item.variantId?.toString() === variantId || (!item.variantId && !variantId)))
    );
    await cart.save();

    ApiResponse.success(res, 200, 'Item removed from cart successfully', { cart });
  } catch (error) {
    next(error);
  }
};

// Clear cart
exports.clearCart = async (req, res, next) => {
  try {
    const userId = req.user._id;

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

// Place order from cart
exports.placeOrderFromCart = async (req, res, next) => {
  try {
    const { shippingAddress } = req.body;
    const userId = req.user._id;

    // Find user's cart
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty');
    }

    // Validate stock and prepare order items
    let totalPrice = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.productId;
      let price, sku, stock;

      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        if (!variant) {
          throw new ApiError(404, `Variant not found for product: ${product.title}`);
        }
        price = variant.discountPrice || variant.price;
        sku = variant.sku;
        stock = variant.stock;
      } else {
        price = product.discountPrice || product.price;
        sku = product.sku;
        stock = product.stock;
      }

      if (stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for product: ${product.title}${item.variantId ? ' (variant)' : ''}`);
      }

      totalPrice += price * item.quantity;
      orderItems.push({
        productId: product._id,
        variantId: item.variantId,
        quantity: item.quantity,
        price,
        sku
      });
    }

    // Create order
    const order = new Order({
      orderId: `ORD-${uuidv4().split('-')[0]}`,
      userId,
      items: orderItems,
      totalPrice,
      shippingAddress,
      status: 'pending'
    });

    await order.save();

    // Decrease stock
    for (const item of cart.items) {
      const product = item.productId;
      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        variant.stock -= item.quantity;
      } else {
        product.stock -= item.quantity;
      }
      await product.save();
    }

    // Clear the cart
    cart.items = [];
    await cart.save();

    // Emit Socket.io event for admin notification
    const io = req.app.get('socketio');
    io.to('adminRoom').emit('newOrder', {
      orderId: order.orderId,
      userId: order.userId,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt
    });

    ApiResponse.success(res, 201, 'Order placed successfully from cart', { order });
  } catch (error) {
    next(error);
  }
};