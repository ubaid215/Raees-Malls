const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Discount = require('../models/Discount');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// Add this helper function
const generateQR = async (text, options) => {
  return await QRCode.toDataURL(text, options);
};

// Helper function to extract variant information from order items
const extractVariantInfo = (item) => {
  let variantInfo = {};

  switch (item.variantType) {
    case 'color':
      if (item.colorVariant) {
        variantInfo.colorName = item.colorVariant.color?.name;
      }
      break;
    case 'storage':
      if (item.storageVariant) {
        variantInfo.colorName = item.storageVariant.color?.name;
        variantInfo.storageCapacity = item.storageVariant.storageOption?.capacity;
      }
      break;
    case 'size':
      if (item.sizeVariant) {
        variantInfo.colorName = item.sizeVariant.color?.name;
        variantInfo.size = item.sizeVariant.sizeOption?.size;
      }
      break;
    default:
      break;
  }

  return variantInfo;
};

// Helper function to calculate item price based on variant type
const calculateItemPrice = (item) => {
  switch (item.variantType) {
    case 'simple':
      return item.simpleProduct.discountPrice || item.simpleProduct.price;
    case 'color':
      return item.colorVariant.discountPrice || item.colorVariant.price;
    case 'storage':
      return item.storageVariant.storageOption.discountPrice ||
        item.storageVariant.storageOption.price;
    case 'size':
      return item.sizeVariant.sizeOption.discountPrice ||
        item.sizeVariant.sizeOption.price;
    default:
      return 0;
  }
};

// Helper function to calculate item details for invoice
const calculateItemDetails = (item) => {
  let quantity, finalUnitPrice;

  switch (item.variantType) {
    case 'simple':
      quantity = item.simpleProduct.quantity;
      finalUnitPrice = item.simpleProduct.discountPrice || item.simpleProduct.price;
      break;
    case 'color':
      quantity = item.colorVariant.quantity;
      finalUnitPrice = item.colorVariant.discountPrice || item.colorVariant.price;
      break;
    case 'storage':
      quantity = item.storageVariant.quantity;
      finalUnitPrice = item.storageVariant.storageOption.discountPrice ||
        item.storageVariant.storageOption.price;
      break;
    case 'size':
      quantity = item.sizeVariant.quantity;
      finalUnitPrice = item.sizeVariant.sizeOption.discountPrice ||
        item.sizeVariant.sizeOption.price;
      break;
    default:
      quantity = 0;
      finalUnitPrice = 0;
  }

  return {
    quantity,
    finalUnitPrice,
    itemTotal: quantity * finalUnitPrice
  };
};

exports.placeOrder = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    console.log(`[ORDER] Start placing order | userId=${userId}`);

    if (!userId) {
      console.warn(`[ORDER] Unauthorized attempt to place order`);
      throw new ApiError(401, 'User not authenticated');
    }

    const { items, shippingAddress, discountCode, saveAddress, paymentMethod = 'cash_on_delivery' } = req.body;
    console.log(`[ORDER] Payload received`, { itemsCount: items?.length, paymentMethod, discountCode });

    if (!items || items.length === 0) {
      console.warn(`[ORDER] Empty items in order | userId=${userId}`);
      throw new ApiError(400, 'Order must contain at least one item');
    }

    if (!shippingAddress || typeof shippingAddress !== 'object') {
      console.warn(`[ORDER] Invalid shipping address | userId=${userId}`);
      throw new ApiError(400, 'Shipping address is required');
    }

    const requiredAddressFields = ['fullName', 'addressLine1', 'city', 'state', 'postalCode', 'country', 'phone'];
    const missingFields = requiredAddressFields.filter(field => !shippingAddress[field]);
    if (missingFields.length > 0) {
      console.warn(`[ORDER] Missing shipping fields`, { missingFields });
      throw new ApiError(400, `Missing required shipping fields: ${missingFields.join(', ')}`);
    }

    let subtotal = 0;
    let totalShippingCost = 0;
    const orderItems = [];
    const productsToUpdate = [];

    console.log(`[ORDER] Processing items...`);

    for (const item of items) {
      if (!item.productId) {
        console.error(`[ORDER] Item without productId found`, item);
        throw new ApiError(400, 'Each item must have a productId');
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        console.error(`[ORDER] Product not found`, { productId: item.productId });
        throw new ApiError(404, `Product not found: ${item.productId}`);
      }

      console.log(`[ORDER] Processing product`, { productId: product._id, title: product.title });

      const variantType = item.variantType || (product.variants?.length ? null : 'simple');
      if (!variantType) {
        console.error(`[ORDER] Variant type missing for product with variants`, { productId: product._id });
        throw new ApiError(400, 'Variant type is required for products with variants');
      }

      let itemDetails;
      let stockToReduce;

      switch (variantType) {
        case 'simple':
          console.log(`[ORDER] Handling simple variant`, { productId: product._id });
          if (product.stock < item.quantity) {
            throw new ApiError(400, `Insufficient stock for product: ${product.title}`);
          }
          itemDetails = {
            productId: product._id,
            variantType: 'simple',
            simpleProduct: {
              price: product.price,
              discountPrice: product.discountPrice,
              quantity: item.quantity,
              sku: product.sku
            },
            itemName: product.title,
            itemImage: product.images[0] || {}
          };
          stockToReduce = { productId: product._id, quantity: item.quantity };
          break;

        case 'color':
          console.log(`[ORDER] Handling color variant`, { productId: product._id, color: item.colorVariant?.color?.name });
          const colorVariant = product.variants.find(v => v.color && v.color.name === item.colorVariant.color.name);
          if (!colorVariant) throw new ApiError(404, `Color variant not found: ${item.colorVariant.color.name}`);
          if (colorVariant.stock < item.quantity) {
            throw new ApiError(400, `Insufficient stock for color variant: ${colorVariant.color.name}`);
          }
          itemDetails = {
            productId: product._id,
            variantType: 'color',
            colorVariant: {
              variantId: colorVariant._id,
              color: { name: colorVariant.color.name },
              price: colorVariant.price,
              discountPrice: colorVariant.discountPrice,
              quantity: item.quantity,
              sku: colorVariant.sku
            },
            itemName: `${product.title} (${colorVariant.color.name})`,
            itemImage: colorVariant.images[0] || product.images[0] || {}
          };
          stockToReduce = { productId: product._id, variantId: colorVariant._id, quantity: item.quantity, path: 'variants.$.stock' };
          break;

        case 'storage':
          console.log(`[ORDER] Handling storage variant`, {
            productId: product._id,
            capacity: item.storageVariant?.storageOption?.capacity,
            variantId: item.storageVariant?.variantId,
            colorName: item.storageVariant?.color?.name
          });

          // Handle both old and new formats
          const storageVariant = product.variants.find(v => {
            // Check if we have a variantId to match (new format)
            if (item.storageVariant?.variantId && v._id.equals(item.storageVariant.variantId)) {
              return true;
            }

            // Check if we have color name to match (old format or new format with color)
            const itemColorName = item.storageVariant?.color?.name || item.storageVariant?.colorName;
            if (itemColorName && v.color && v.color.name === itemColorName) {
              return true;
            }

            // If no specific variant is specified, use the first variant with storage options
            if (!item.storageVariant?.variantId && !itemColorName && v.storageOptions?.length > 0) {
              return true;
            }

            return false;
          });

          if (!storageVariant) {
            console.error(`[ORDER] Storage variant not found`, {
              productId: product._id,
              variants: product.variants,
              itemStorageVariant: item.storageVariant
            });
            throw new ApiError(404, `Storage variant not found for product`);
          }

          // Handle both old and new capacity formats
          const capacityToFind = item.storageVariant?.storageOption?.capacity || item.storageVariant?.capacity;
          if (!capacityToFind) {
            console.error(`[ORDER] Capacity not specified`, { itemStorageVariant: item.storageVariant });
            throw new ApiError(400, 'Storage capacity is required');
          }

          const storageOption = storageVariant.storageOptions?.find(opt =>
            opt.capacity === capacityToFind
          );

          if (!storageOption) {
            console.error(`[ORDER] Storage option not found`, {
              capacity: capacityToFind,
              availableOptions: storageVariant.storageOptions?.map(opt => opt.capacity)
            });
            throw new ApiError(404, `Storage option not found: ${capacityToFind}`);
          }

          if (storageOption.stock < item.quantity) {
            throw new ApiError(400, `Insufficient stock for storage option: ${storageOption.capacity}`);
          }

          itemDetails = {
            productId: product._id,
            variantType: 'storage',
            storageVariant: {
              variantId: storageVariant._id,
              color: storageVariant.color ? { name: storageVariant.color.name } : undefined,
              storageOption: {
                _id: storageOption._id,
                capacity: storageOption.capacity,
                price: storageOption.price,
                discountPrice: storageOption.discountPrice,
                sku: storageOption.sku
              },
              quantity: item.quantity
            },
            itemName: `${product.title}${storageVariant.color ? ` (${storageVariant.color.name})` : ''}, ${storageOption.capacity}`,
            itemImage: storageVariant.images?.[0] || product.images[0] || {}
          };

          stockToReduce = {
            productId: product._id,
            variantId: storageVariant._id,
            storageOptionId: storageOption._id,
            quantity: item.quantity,
            path: 'variants.$[v].storageOptions.$[s].stock'
          };
          break;

        case 'size':
          console.log(`[ORDER] Handling size variant`, { productId: product._id, size: item.sizeVariant?.sizeOption?.size });

          const sizeVariant = product.variants.find(v => {
            if (item.sizeVariant?.variantId && v._id.equals(item.sizeVariant.variantId)) return true;
            if (item.sizeVariant?.color?.name && v.color?.name === item.sizeVariant.color.name) return true;
            return false;
          });

          if (!sizeVariant) throw new ApiError(404, `Size variant not found`);

          const sizeOption = sizeVariant.sizeOptions?.find(opt =>
            (item.sizeVariant.sizeOption?._id && opt._id.equals(item.sizeVariant.sizeOption._id)) ||
            opt.size === item.sizeVariant.sizeOption?.size ||
            opt.sku === item.sizeVariant.sizeOption?.sku
          );

          if (!sizeOption) throw new ApiError(404, `Size option not found: ${item.sizeVariant?.sizeOption?.size}`);
          if (sizeOption.stock < item.quantity) {
            throw new ApiError(400, `Insufficient stock for size option: ${sizeOption.size}`);
          }

          itemDetails = {
            productId: product._id,
            variantType: 'size',
            sizeVariant: {
              variantId: sizeVariant._id,
              color: sizeVariant.color ? { name: sizeVariant.color.name } : undefined,
              sizeOption: {
                _id: sizeOption._id,
                size: sizeOption.size,
                price: sizeOption.price,
                discountPrice: sizeOption.discountPrice,
                sku: sizeOption.sku
              },
              quantity: item.quantity
            },
            itemName: `${product.title}${sizeVariant.color ? ` (${sizeVariant.color.name})` : ''}, ${sizeOption.size}`,
            itemImage: sizeVariant.images?.[0] || product.images[0] || {}
          };

          stockToReduce = {
            productId: product._id,
            variantId: sizeVariant._id,
            sizeOptionId: sizeOption._id,
            quantity: item.quantity,
            path: 'variants.$[v].sizeOptions.$[s].stock'
          };
          break;


        default:
          console.error(`[ORDER] Invalid variant type`, { variantType, productId: product._id });
          throw new ApiError(400, 'Invalid variant type');
      }

      const itemPrice = calculateItemPrice(itemDetails);
      subtotal += itemPrice * item.quantity;
      totalShippingCost += product.shippingCost || 0;

      orderItems.push(itemDetails);
      productsToUpdate.push(stockToReduce);

      console.log(`[ORDER] Item processed`, { productId: product._id, quantity: item.quantity });
    }

    // --- Discount Handling ---
    let discountAmount = 0;
    let discountId = null;
    if (discountCode) {
      console.log(`[ORDER] Checking discount`, { discountCode });
      const discount = await Discount.findOne({
        code: discountCode,
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });
      if (discount) {
        console.log(`[ORDER] Discount applied`, { discountCode, discountType: discount.type, discountValue: discount.value });
        discountAmount = discount.type === 'percentage' ? (discount.value / 100) * subtotal : Math.min(discount.value, subtotal);
        discountId = discount._id;
        discount.usedCount += 1;
        await discount.save();
      } else {
        console.warn(`[ORDER] Discount not valid`, { discountCode });
      }
    }

    // --- Order Creation ---
    const order = new Order({
      orderId: `ORD-${uuidv4().split('-')[0]}`,
      userId,
      items: orderItems,
      subtotal,
      totalShippingCost,
      discountId,
      discountAmount,
      totalAmount: subtotal + totalShippingCost - discountAmount,
      paymentMethod,
      status: 'pending',
      shippingAddress
    });

    await order.save();
    console.log(`[ORDER] Order saved successfully`, { orderId: order.orderId, userId });

    // --- Save address ---
    if (saveAddress) {
      console.log(`[ORDER] Saving address for user`, { userId });
      await User.findByIdAndUpdate(userId, { $addToSet: { addresses: { ...shippingAddress } } });
    }

    // --- Stock Update ---
    for (const update of productsToUpdate) {
      try {
        console.log(`[ORDER] Updating stock`, update);
        if (update.path) {
          if (update.path.includes('$[v]')) {
            await Product.updateOne(
              { _id: update.productId },
              { $inc: { [update.path]: -update.quantity } },
              { arrayFilters: [{ 'v._id': update.variantId }, { 's._id': update.storageOptionId || update.sizeOptionId }] }
            );
          } else {
            await Product.updateOne(
              { _id: update.productId, 'variants._id': update.variantId },
              { $inc: { [update.path]: -update.quantity } }
            );
          }
        } else {
          await Product.findByIdAndUpdate(update.productId, { $inc: { stock: -update.quantity } });
        }
      } catch (stockError) {
        console.error(`[ORDER] Failed to update stock`, { update, error: stockError.message });
      }
    }

    // --- Notifications ---
    console.log(`[ORDER] Sending notifications`, { orderId: order.orderId });
    const user = await User.findById(userId, 'name email');
    const notificationData = {
      id: uuidv4(),
      title: '🛍️ New Order Placed!',
      message: `${user?.name || 'A customer'} placed order #${order.orderId}`,
      type: 'order',
      orderId: order.orderId,
      orderTotal: order.totalAmount,
      itemCount: order.items.length,
      timestamp: new Date().toISOString(),
      customerName: user?.name || 'Customer',
      customerEmail: user?.email
    };

    const io = req.app.get('socketio');
    io.emit('orderNotification', notificationData);
    io.to('adminRoom').emit('newOrder', { order, notification: notificationData });

    const populatedOrder = await Order.findById(order._id).populate('userId', 'name email').populate('discountId', 'code value type');

    console.log(`[ORDER] Order flow completed successfully`, { orderId: order.orderId });

    ApiResponse.success(res, 201, 'Order placed successfully', {
      order: populatedOrder,
      notification: notificationData
    });

  } catch (error) {
    console.error(`[ORDER] Error placing order`, {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      body: req.body
    });
    next(error);
  }
};


exports.getRecentOrderNotifications = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;

    // Get recent orders and format as notifications
    const recentOrders = await Order.find({})
      .populate('userId', 'name')
      .sort('-createdAt')
      .limit(parseInt(limit));

    const notifications = recentOrders.map(order => ({
      id: order._id,
      title: '🛍️ Recent Order',
      message: `${order.userId?.name || 'A customer'} placed order #${order.orderId} with ${order.items.length} items`,
      type: 'order',
      orderId: order.orderId,
      orderTotal: order.totalAmount,
      itemCount: order.items.length,
      timestamp: order.createdAt.toISOString(),
      customerName: order.userId?.name || 'Customer'
    }));

    ApiResponse.success(res, 200, 'Recent order notifications retrieved', {
      notifications
    });
  } catch (error) {
    next(error);
  }
};

exports.getRevenueStats = async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    let matchStage = {};
    let groupStage = {};
    let sortStage = { _id: 1 };

    // Date filtering
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Grouping by time period
    switch (period) {
      case 'day':
        groupStage = {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalRevenue: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
            averageOrderValue: { $avg: "$totalAmount" }
          }
        };
        break;
      case 'week':
        groupStage = {
          $group: {
            _id: { $week: "$createdAt" },
            totalRevenue: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
            averageOrderValue: { $avg: "$totalAmount" }
          }
        };
        break;
      case 'month':
      default:
        groupStage = {
          $group: {
            _id: { $month: "$createdAt" },
            totalRevenue: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
            averageOrderValue: { $avg: "$totalAmount" }
          }
        };
        break;
      case 'year':
        groupStage = {
          $group: {
            _id: { $year: "$createdAt" },
            totalRevenue: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
            averageOrderValue: { $avg: "$totalAmount" }
          }
        };
        break;
    }

    const stats = await Order.aggregate([
      { $match: matchStage },
      groupStage,
      { $sort: sortStage }
    ]);

    ApiResponse.success(res, 200, 'Revenue stats retrieved', {
      period,
      stats
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductRevenue = async (req, res, next) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const productStats = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: [
                "$items.quantity",
                {
                  $cond: [
                    { $eq: ["$items.variantType", "simple"] },
                    "$items.simpleProduct.price",
                    {
                      $cond: [
                        { $eq: ["$items.variantType", "color"] },
                        "$items.colorVariant.price",
                        {
                          $cond: [
                            { $eq: ["$items.variantType", "storage"] },
                            "$items.storageVariant.storageOption.price",
                            "$items.sizeVariant.sizeOption.price"
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $project: {
          productId: "$_id",
          productName: "$product.title",
          totalQuantity: 1,
          totalRevenue: 1,
          image: { $arrayElemAt: ["$product.images.url", 0] }
        }
      }
    ]);

    ApiResponse.success(res, 200, 'Product revenue stats retrieved', {
      products: productStats
    });
  } catch (error) {
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
      .populate('discountId', 'code value type');

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const fileName = `invoice-${order.orderId}.pdf`;
    const filePath = path.join(__dirname, '../invoices', fileName);

    // Ensure invoices folder exists
    if (!fs.existsSync(path.join(__dirname, '../invoices'))) {
      fs.mkdirSync(path.join(__dirname, '../invoices'), { recursive: true });
    }

    // Set headers ONCE before piping
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    const doc = new PDFDocument({
      margin: 30, // Reduced margin
      size: 'A4',
      info: {
        Title: `Invoice-${order.orderId}`,
        Author: 'Raees Malls',
        Subject: 'Invoice',
        Keywords: 'invoice, order, receipt'
      }
    });

    // Pipe to both client and file
    doc.pipe(res);
    doc.pipe(fs.createWriteStream(filePath));

    // ==============================
    // Colors
    const primaryColor = '#dc2626';
    const secondaryColor = '#6b7280';
    const accentColor = '#b91c1c';
    const lightRed = '#fee2e2';
    const darkRed = '#991b1b';
    // ==============================

    // Generate QR code
    const qrData = order.items.map(
      item => `${process.env.FRONTEND_URL}/product/${item.productId}`
    );

    // Encode as JSON
    const qrCodeDataURL = await generateQR(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      margin: 1,
      scale: 3 // Reduced scale
    });

    const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');

    // ==============================
    // COMPACT HEADER (60px height)
    // ==============================
    doc.rect(30, 30, doc.page.width - 60, 60).fill('white').stroke(primaryColor).lineWidth(1);
    
    // Company name and QR code on same line
    doc.fillColor(darkRed).fontSize(16).font('Helvetica-Bold')
      .text('Raees Malls', 40, 45);
    
    doc.fillColor(secondaryColor).fontSize(8).font('Helvetica')
      .text('Masjid Bazar Opposite Jamia Masjid Jaranwala | Phone: 0300-6530063', 40, 62)
      .text('raeesmalls1@gmail.com', 40, 75);

    // Smaller QR code
    doc.image(qrCodeBuffer, doc.page.width - 90, 35, { width: 50, height: 50 });

    // ==============================
    // INVOICE TITLE BAR (25px height)
    // ==============================
    const titleY = 100;
    doc.rect(30, titleY, doc.page.width - 60, 25).fill(primaryColor);
    doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
      .text('INVOICE', 0, titleY + 7, { align: 'center' });

    // ==============================
    // INVOICE & CUSTOMER DETAILS (50px height)
    // ==============================
    const detailsY = 135;
    const boxWidth = (doc.page.width - 70) / 2;
    
    // Invoice Details Box
    doc.rect(30, detailsY, boxWidth, 50).stroke(primaryColor).fillColor(lightRed).fill();
    doc.fillColor(darkRed).fontSize(10).font('Helvetica-Bold')
      .text('Invoice Details', 35, detailsY + 5);
    doc.fillColor('#374151').fontSize(8).font('Helvetica')
      .text(`Invoice #: ${order.orderId}`, 35, detailsY + 18)
      .text(`Date: ${order.createdAt.toLocaleDateString()}`, 35, detailsY + 30)
      .text(`Status: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`, 35, detailsY + 42);

    // Customer Details Box
    const customerBoxX = 40 + boxWidth;
    doc.rect(customerBoxX, detailsY, boxWidth, 50).stroke(primaryColor).fillColor('white').fill();
    doc.fillColor(darkRed).fontSize(10).font('Helvetica-Bold')
      .text('Customer Details', customerBoxX + 5, detailsY + 5);
    doc.fillColor('#374151').fontSize(8).font('Helvetica')
      .text(`Name: ${order.userId.name}`, customerBoxX + 5, detailsY + 18)
      .text(`Email: ${order.userId.email}`, customerBoxX + 5, detailsY + 30);

    // ==============================
    // COMPACT SHIPPING ADDRESS (40px height)
    // ==============================
    const shippingY = 195;
    doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
      .text('Shipping Address', 30, shippingY);
    doc.rect(30, shippingY + 15, doc.page.width - 60, 40).stroke(primaryColor).fillColor('white').fill();
    
    let addressText = `${order.shippingAddress.fullName}, ${order.shippingAddress.addressLine1}`;
    if (order.shippingAddress.addressLine2) {
      addressText += `, ${order.shippingAddress.addressLine2}`;
    }
    addressText += `, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`;
    
    doc.fillColor('#374151').fontSize(8).font('Helvetica')
      .text(addressText, 35, shippingY + 22, { width: doc.page.width - 70 })
      .text(`Phone: ${order.shippingAddress.phone}`, 35, shippingY + 40);

    // ==============================
    // COMPACT ITEMS TABLE
    // ==============================
    const tableY = 255;
    doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
      .text('Order Items', 30, tableY);

    // Table header (20px height)
    doc.rect(30, tableY + 15, doc.page.width - 60, 20).fill(primaryColor);
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
      .text('Item', 35, tableY + 22)
      .text('Price', 280, tableY + 22, { width: 60, align: 'right' })
      .text('Qty', 350, tableY + 22, { width: 30, align: 'right' })
      .text('Total', 390, tableY + 22, { width: 60, align: 'right' });

    let currentY = tableY + 40;
    doc.fillColor('#374151').font('Helvetica');

    // Compact item rows (20px each)
    order.items.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.rect(30, currentY - 2, doc.page.width - 60, 20).fill(lightRed).stroke(primaryColor);
      } else {
        doc.rect(30, currentY - 2, doc.page.width - 60, 20).fill('white').stroke(primaryColor);
      }

      const variantInfo = extractVariantInfo(item);
      const variantText = variantInfo ?
        Object.entries(variantInfo)
          .filter(([_, value]) => value)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ') : '';

      const itemDetails = calculateItemDetails(item);

      // Compact item display
      let itemDisplayText = item.itemName;
      if (variantText) {
        itemDisplayText += ` (${variantText})`;
      }

      doc.fillColor('#374151').fontSize(8).font('Helvetica')
        .text(itemDisplayText, 35, currentY + 5, { width: 240 })
        .text(`PKR ${itemDetails.finalUnitPrice.toFixed(2)}`, 280, currentY + 5, { width: 60, align: 'right' })
        .text(itemDetails.quantity.toString(), 350, currentY + 5, { width: 30, align: 'right' })
        .text(`PKR ${itemDetails.itemTotal.toFixed(2)}`, 390, currentY + 5, { width: 60, align: 'right' });

      currentY += 22;
    });

    // ==============================
    // COMPACT SUMMARY (80px height)
    // ==============================
    const summaryY = currentY + 10;
    const summaryBoxWidth = 180;
    const summaryBoxX = doc.page.width - 30 - summaryBoxWidth;

    let summaryHeight = 60;
    if (order.discountAmount && order.discountAmount > 0) {
      summaryHeight += 15;
    }

    doc.rect(summaryBoxX, summaryY, summaryBoxWidth, summaryHeight).fill('white').stroke(primaryColor).lineWidth(1);
    
    doc.fillColor('#374151').fontSize(9).font('Helvetica')
      .text(`Subtotal:`, summaryBoxX + 8, summaryY + 8)
      .text(`PKR ${order.subtotal.toFixed(2)}`, summaryBoxX + 8, summaryY + 8, { width: summaryBoxWidth - 16, align: 'right' });

    let summaryLineY = summaryY + 23;

    if (order.discountAmount && order.discountAmount > 0) {
      const discountCode = order.discountId?.code || 'DISCOUNT';
      doc.fillColor(accentColor)
        .text(`Discount (${discountCode}):`, summaryBoxX + 8, summaryLineY)
        .text(`-PKR ${order.discountAmount.toFixed(2)}`, summaryBoxX + 8, summaryLineY, { width: summaryBoxWidth - 16, align: 'right' });
      summaryLineY += 15;
    }

    doc.fillColor('#374151')
      .text(`Shipping:`, summaryBoxX + 8, summaryLineY)
      .text(`PKR ${order.totalShippingCost.toFixed(2)}`, summaryBoxX + 8, summaryLineY, { width: summaryBoxWidth - 16, align: 'right' });

    // Total line
    doc.rect(summaryBoxX, summaryLineY + 15, summaryBoxWidth, 20).fill(primaryColor);
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
      .text('Total:', summaryBoxX + 8, summaryLineY + 20)
      .text(`PKR ${order.totalAmount.toFixed(2)}`, summaryBoxX + 8, summaryLineY + 20, { width: summaryBoxWidth - 16, align: 'right' });

    // ==============================
    // COMPACT PAYMENT & FOOTER (40px height)
    // ==============================
    const paymentY = summaryY + summaryHeight + 10;
    doc.rect(30, paymentY, doc.page.width - 60, 25).fill(lightRed).stroke(primaryColor).lineWidth(1);
    doc.fillColor(darkRed).fontSize(9).font('Helvetica-Bold')
      .text('Payment Method:', 35, paymentY + 5);
    doc.fillColor('#374151').fontSize(8).font('Helvetica')
      .text(`${order.paymentMethod.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}`, 110, paymentY + 5);

    // Compact footer
    const footerY = paymentY + 35;
    doc.rect(30, footerY, doc.page.width - 60, 25).fill(darkRed);
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
      .text('Thank you for your purchase!', 0, footerY + 8, { align: 'center' });

    // ==============================
    // FINALIZE
    // ==============================
    doc.end();

    // Cleanup file after sending
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);

  } catch (error) {
    next(error);
  }
};
