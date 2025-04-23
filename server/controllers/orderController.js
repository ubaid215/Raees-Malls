const Order = require('../models/Order');
const Product = require('../models/Product');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Place a new order (User only)
exports.placeOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress } = req.body;
    const userId = req.user._id;

    // Validate items
    if (!items || items.length === 0) {
      throw new ApiError(400, 'Order must contain at least one item');
    }

    // Calculate total price and verify stock
    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId}`);
      }
      if (product.stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for product: ${product.title}`);
      }

      totalPrice += product.price * item.quantity;
      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price,
        sku: product.sku
      });

      // Decrease stock
      product.stock -= item.quantity;
      await product.save();
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

    // Emit Socket.io event for admin notification
    const io = req.app.get('socketio');
    io.to('adminRoom').emit('newOrder', {
      orderId: order.orderId,
      userId: order.userId,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt
    });

    ApiResponse.success(res, 201, 'Order placed successfully', { order });
  } catch (error) {
    next(error);
  }
};

// Get user's order history (User only)
exports.getUserOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user._id;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('items.productId', 'title brand sku')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    ApiResponse.success(res, 200, 'Orders retrieved successfully', {
      orders,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

// Get all orders (Admin only)
exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('userId', 'email')
      .populate('items.productId', 'title brand sku')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    ApiResponse.success(res, 200, 'Orders retrieved successfully', {
      orders,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

// Update order status (Admin only)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    order.status = status;
    await order.save();

    // Emit Socket.io event for user and admin
    const io = req.app.get('socketio');
    io.to(`user_${order.userId}`).emit('orderStatusUpdate', {
      orderId: order.orderId,
      status: order.status,
      updatedAt: order.updatedAt
    });
    io.to('adminRoom').emit('orderStatusUpdate', {
      orderId: order.orderId,
      status: order.status,
      updatedAt: order.updatedAt
    });

    ApiResponse.success(res, 200, 'Order status updated successfully', { order });
  } catch (error) {
    next(error);
  }
};

// Generate and download invoice (Admin only)
exports.downloadInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId })
      .populate('userId', 'email')
      .populate('items.productId', 'title brand sku');

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `invoice-${order.orderId}.pdf`;
    const filePath = path.join(__dirname, '../invoices', fileName);

    // Ensure invoices directory exists
    if (!fs.existsSync(path.join(__dirname, '../invoices'))) {
      fs.mkdirSync(path.join(__dirname, '../invoices'), { recursive: true });
    }

    doc.pipe(fs.createWriteStream(filePath));
    doc.pipe(res);

    // PDF Header
    doc.fontSize(20).text('Raees Mobiles - Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order.orderId}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.text(`Customer: ${order.userId.email}`);
    doc.moveDown();

    // Shipping Address
    doc.fontSize(14).text('Shipping Address', { underline: true });
    doc.fontSize(12).text(`${order.shippingAddress.fullName}`);
    doc.text(`${order.shippingAddress.addressLine1}`);
    if (order.shippingAddress.addressLine2) {
      doc.text(`${order.shippingAddress.addressLine2}`);
    }
    doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`);
    doc.text(`${order.shippingAddress.country}`);
    doc.text(`Phone: ${order.shippingAddress.phone}`);
    doc.moveDown();

    // Items Table
    doc.fontSize(14).text('Items', { underline: true });
    doc.moveDown(0.5);

    // Table Header
    const tableTop = doc.y;
    const itemWidth = 150;
    const skuWidth = 100;
    const qtyWidth = 50;
    const priceWidth = 100;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item', 50, tableTop, { width: itemWidth });
    doc.text('SKU', 200, tableTop, { width: skuWidth });
    doc.text('Qty', 300, tableTop, { width: qtyWidth, align: 'right' });
    doc.text('Price', 350, tableTop, { width: priceWidth, align: 'right' });
    doc.moveDown(0.5);

    // Table Rows
    let y = doc.y;
    doc.font('Helvetica');
    order.items.forEach(item => {
      doc.text(item.productId.title, 50, y, { width: itemWidth });
      doc.text(item.sku, 200, y, { width: skuWidth });
      doc.text(item.quantity.toString(), 300, y, { width: qtyWidth, align: 'right' });
      doc.text(`$${item.price.toFixed(2)}`, 350, y, { width: priceWidth, align: 'right' });
      y += 15;
    });

    // Total
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Total: $${order.totalPrice.toFixed(2)}`, { align: 'right' });

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).text('Thank you for shopping with Raees Mobiles!', { align: 'center' });

    doc.end();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  } catch (error) {
    next(error);
  }
};