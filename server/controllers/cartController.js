const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { v4: uuidv4 } = require('uuid');

// Add or update item in cart
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    // Validate product
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Check stock
    if (product.stock < quantity) {
      throw new ApiError(400, `Insufficient stock for product: ${product.title}`);
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

    // Check if product already in cart
    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex > -1) {
      // Update quantity
      cart.items[itemIndex].quantity = quantity;
    } else {
      // Add new item
      cart.items.push({ productId, quantity });
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
      .populate('items.productId', 'title price stock brand sku images');

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
    const { productId } = req.params;
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    cart.items = cart.items.filter(item => item.productId.toString() !== productId);
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

    // Validate stock for all items
    for (const item of cart.items) {
      const product = item.productId;
      if (product.stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for product: ${product.title}`);
      }
    }

    // Calculate total price and prepare order items
    let totalPrice = 0;
    const orderItems = cart.items.map(item => {
      const product = item.productId;
      totalPrice += product.price * item.quantity;
      return {
        productId: product._id,
        quantity: item.quantity,
        price: product.price,
        sku: product.sku
      };
    });

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

    // Decrease stock for each product
    for (const item of cart.items) {
      const product = item.productId;
      product.stock -= item.quantity;
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