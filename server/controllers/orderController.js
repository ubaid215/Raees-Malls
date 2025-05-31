const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Discount = require('../models/Discount');
const User = require('../models/User'); // Import User model
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.placeOrder = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { items, shippingAddress, discountCode, saveAddress } = req.body;

    if (!items || items.length === 0) {
      throw new ApiError(400, 'Order must contain at least one item');
    }

    let totalPrice = 0;
    let totalShippingCost = 0;
    const orderItems = [];
    const uniqueProducts = new Set();

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
          { applicableTo: 'orders' },
        ],
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

    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    totalShippingCost = totalPrice >= 2500 || totalItems >= 2500 ? 0 : totalShippingCost;

    const order = new Order({
      orderId: `ORD-${uuidv4().split('-')[0]}`,
      userId,
      items: orderItems,
      totalPrice: totalPrice - discountAmount,
      totalShippingCost,
      discountId,
      discountAmount,
      shippingAddress,
      status: 'pending',
    });

    await order.save();

    // Save address to user's profile if saveAddress is true
    if (saveAddress) {
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Map shippingAddress to User address format
      const newAddress = {
        fullName: shippingAddress.fullName,
        street: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2 || '',
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip: shippingAddress.postalCode,
        country: shippingAddress.country,
        phone: shippingAddress.phone,
        isDefault: user.addresses.length === 0, // Set as default if first address
      };

      // Check if address already exists (case-insensitive and trimmed)
      const addressExists = user.addresses.some(
        addr =>
          addr.street.trim().toLowerCase() === newAddress.street.trim().toLowerCase() &&
          addr.city.trim().toLowerCase() === newAddress.city.trim().toLowerCase() &&
          addr.zip.trim().toLowerCase() === newAddress.zip.trim().toLowerCase() &&
          addr.country.trim().toLowerCase() === newAddress.country.trim().toLowerCase()
      );

      if (!addressExists) {
        user.addresses.push(newAddress);
        try {
          await user.save();
          console.log('Address saved successfully:', newAddress);
        } catch (error) {
          console.error('Error saving user address:', error);
          throw new ApiError(500, 'Failed to save address to user profile');
        }
      } else {
        console.log('Address already exists, skipping save:', newAddress);
      }
    }

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

    const io = req.app.get('socketio');
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('items.productId', 'title brand sku shippingCost images variants')
      .populate('discountId', 'code value type');

    io.to('adminRoom').emit('orderCreated', populatedOrder);
    io.to(`user_${userId}`).emit('orderCreated', populatedOrder);

    ApiResponse.success(res, 201, 'Order placed successfully', { order: populatedOrder });
  } catch (error) {
    console.error('Error in placeOrder:', error);
    next(error);
  }
};

exports.getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { page = 1, limit = 10, status } = req.query;
    const query = { userId };
    if (status) query.status = status;
    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate({
        path: 'items.productId',
        select: 'title brand sku shippingCost images variants',
        match: { _id: { $exists: true } },
      })
      .populate('discountId', 'code value type')
      .populate('userId', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    ApiResponse.success(res, 200, 'Orders retrieved successfully', {
      orders: orders.filter(order => order.items.every(item => item.productId)),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error in getUserOrders:', error);
    next(error);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('userId', 'name email')
      .populate('items.productId', 'title brand sku shippingCost images variants')
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
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

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

    const io = req.app.get('socketio');
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('items.productId', 'title brand sku shippingCost images variants')
      .populate('discountId', 'code value type');

    io.to(`user_${order.userId}`).emit('orderStatusUpdated', populatedOrder);
    io.to('adminRoom').emit('orderStatusUpdated', populatedOrder);

    ApiResponse.success(res, 200, 'Order status updated successfully', { order: populatedOrder });
  } catch (error) {
    next(error);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { orderId } = req.params;

    const order = await Order.findOne({ orderId, userId });
    if (!order) {
      throw new ApiError(404, 'Order not found or you do not have permission to cancel this order');
    }

    if (order.status !== 'pending') {
      throw new ApiError(400, 'Order can only be canceled while in pending status');
    }

    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId}`);
      }
      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        if (!variant) {
          throw new ApiError(404, `Variant not found for product: ${product.title}`);
        }
        variant.stock += item.quantity;
      } else {
        product.stock += item.quantity;
      }
      await product.save();
    }

    order.status = 'cancelled';
    await order.save();

    const io = req.app.get('socketio');
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('items.productId', 'title brand sku shippingCost images variants')
      .populate('discountId', 'code value type');

    io.to(`user_${userId}`).emit('orderStatusUpdated', populatedOrder);
    io.to('adminRoom').emit('orderStatusUpdated', populatedOrder);

    ApiResponse.success(res, 200, 'Order cancelled successfully', { order: populatedOrder });
  } catch (error) {
    next(error);
  }
};

exports.downloadInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId })
      .populate('userId', 'name email')
      .populate('items.productId', 'title brand sku shippingCost images variants')
      .populate('discountId', 'code value type');

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const doc = new PDFDocument({ margin: 50 });
    const fileName = `invoice-${order.orderId}.pdf`;
    const filePath = path.join(__dirname, '../invoices', fileName);

    if (!fs.existsSync(path.join(__dirname, '../invoices'))) {
      fs.mkdirSync(path.join(__dirname, '../invoices'), { recursive: true });
    }

    doc.pipe(fs.createWriteStream(filePath));
    doc.pipe(res);

    doc.fontSize(20).text('Raees Malls - Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order.orderId}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.text(`Customer: ${order.userId.name} (${order.userId.email})`);
    doc.moveDown();

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

    doc.fontSize(14).text('Items', { underline: true });
    doc.moveDown(0.5);

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

    let y = doc.y;
    doc.font('Helvetica');
    order.items.forEach(item => {
      const variantDetails = item.variantId
        ? order.items.productId?.variants?.id(item.variantId)?.attributes?.map(attr => `${attr.key}: ${attr.value}`).join(', ') || ''
        : '';
      doc.text(`${item.productId.title}${variantDetails ? ` (${variantDetails})` : ''}`, 50, y, { width: itemWidth });
      doc.text(item.sku, 200, y, { width: skuWidth });
      doc.text(item.quantity.toString(), 300, y, { width: qtyWidth, align: 'right' });
      doc.text(`PKR ${item.price.toFixed(2)}`, 350, y, { width: priceWidth, align: 'right' });
      y += 15;
    });

    doc.moveDown();
    doc.font('Helvetica').text(`Subtotal: PKR ${(order.totalPrice + (order.discountAmount || 0)).toFixed(2)}`, { align: 'right' });
    if (order.discountId) {
      doc.text(`Discount (${order.discountId.code}): -PKR ${order.discountAmount.toFixed(2)}`, { align: 'right' });
    }
    doc.text(`Shipping: PKR ${order.totalShippingCost.toFixed(2)}`, { align: 'right' });
    doc.font('Helvetica-Bold').text(`Total: PKR ${(order.totalPrice + order.totalShippingCost).toFixed(2)}`, { align: 'right' });

    doc.moveDown(2);
    doc.fontSize(10).text('Thank you for shopping with Raees Malls!', { align: 'center' });

    doc.end();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  } catch (error) {
    next(error);
  }
};