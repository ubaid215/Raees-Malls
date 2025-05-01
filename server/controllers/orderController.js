const Order = require('../models/Order');
const Product = require('../models/Product');
const Discount = require('../models/Discount');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Place a new order (User only)
exports.placeOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, discountCode } = req.body;
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

    // Apply discount if provided
    let discountAmount = 0;
    let discountId = null;
    if (discountCode) {
      const discount = await Discount.findOne({
        code: discountCode,
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
        $or: [
          { applicableTo: 'all' },
          { applicableTo: 'products', productIds: { $in: items.map(item => item.productId) } },
          { applicableTo: 'orders' }
        ]
      });

      if (!discount) {
        throw new ApiError(400, 'Invalid or expired discount code');
      }

      if (discount.minOrderAmount > totalPrice) {
        throw new ApiError(400, 'Order total too low for discount');
      }

      if (discount.usageLimit > 0 && discount.usedCount >= discount.usageLimit) {
        throw new ApiError(400, 'Discount usage limit reached');
      }

      discountAmount = discount.type === 'percentage'
        ? (discount.value / 100) * totalPrice
        : Math.min(discount.value, totalPrice);
      discountId = discount._id;

      discount.usedCount += 1;
      await discount.save();
    }

    // Create order
    const order = new Order({
      orderId: `ORD-${uuidv4().split('-')[0]}`,
      userId,
      items: orderItems,
      totalPrice: totalPrice - discountAmount,
      discountId,
      discountAmount,
      shippingAddress,
      status: 'pending'
    });

    await order.save();

    // Decrease stock
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);
      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        variant.stock -= item.quantity;
      } else {
        product.stock -= item.quantity;
      }
      await product.save();
    }

    // Emit Socket.IO event for admin and user notification
    const io = req.app.get('socketio');
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'email')
      .populate('items.productId', 'title brand sku')
      .populate('discountId', 'code value type');
    
    io.to('adminRoom').emit('orderCreated', populatedOrder);
    io.to(`user_${userId}`).emit('orderCreated', populatedOrder);

    ApiResponse.success(res, 201, 'Order placed successfully', { order: populatedOrder });
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
      .populate('discountId', 'code value type')
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
      .populate('discountId', 'code value type')
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

    // Emit Socket.IO event for user and admin
    const io = req.app.get('socketio');
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'email')
      .populate('items.productId', 'title brand sku')
      .populate('discountId', 'code value type');
    
    io.to(`user_${order.userId}`).emit('orderStatusUpdated', populatedOrder);
    io.to('adminRoom').emit('orderStatusUpdated', populatedOrder);

    ApiResponse.success(res, 200, 'Order status updated successfully', { order: populatedOrder });
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
      .populate('items.productId', 'title brand sku')
      .populate('discountId', 'code value type');

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
      const variantDetails = item.variantId
        ? order.items.productId?.variants?.id(item.variantId)?.attributes?.map(attr => `${attr.key}: ${attr.value}`).join(', ') || ''
        : '';
      doc.text(`${item.productId.title}${variantDetails ? ` (${variantDetails})` : ''}`, 50, y, { width: itemWidth });
      doc.text(item.sku, 200, y, { width: skuWidth });
      doc.text(item.quantity.toString(), 300, y, { width: qtyWidth, align: 'right' });
      doc.text(`$${item.price.toFixed(2)}`, 350, y, { width: priceWidth, align: 'right' });
      y += 15;
    });

    // Discount
    if (order.discountId) {
      doc.moveDown();
      doc.font('Helvetica').text(`Discount (${order.discountId.code}): -$${order.discountAmount.toFixed(2)}`, { align: 'right' });
    }

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