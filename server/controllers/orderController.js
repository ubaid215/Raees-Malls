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

    // Extract all possible parameters from request body
    const {
      items,
      shippingAddress,
      useExistingAddress = false, // New field to indicate using existing address
      existingAddressId, // ID of existing address to use
      discountCode,
      saveAddress,
      paymentMethod = 'cash_on_delivery'
    } = req.body;

    console.log(`[ORDER] Raw request body:`, JSON.stringify(req.body, null, 2));
    console.log(`[ORDER] Parsed payload:`, {
      itemsCount: items?.length,
      paymentMethod,
      discountCode,
      saveAddress,
      useExistingAddress,
      existingAddressId,
      shippingAddress
    });

    if (!items || items.length === 0) {
      console.warn(`[ORDER] Empty items in order | userId=${userId}`);
      throw new ApiError(400, 'Order must contain at least one item');
    }

    let finalShippingAddress = shippingAddress;

    // If user wants to use an existing address
    if (useExistingAddress && existingAddressId) {
      console.log(`[ORDER] Using existing address`, { existingAddressId });

      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const existingAddress = user.addresses.id(existingAddressId);
      if (!existingAddress) {
        throw new ApiError(404, 'Address not found in user profile');
      }

      // Convert Mongoose subdocument to plain object
      finalShippingAddress = existingAddress.toObject();
      console.log(`[ORDER] Using existing address`, finalShippingAddress);
    }
    // Validate shipping address if not using existing one
    else if (!useExistingAddress) {
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

      // Set finalShippingAddress to the provided address
      finalShippingAddress = shippingAddress;
    } else {
      throw new ApiError(400, 'Existing address ID is required when useExistingAddress is true');
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
      shippingAddress: finalShippingAddress
    });

    await order.save();
    console.log(`[ORDER] Order saved successfully`, { orderId: order.orderId, userId });

    // --- IMPROVED Address Saving Logic ---
    if (saveAddress && !useExistingAddress) {
      console.log(`[ORDER] Processing address save request`, { userId });

      const user = await User.findById(userId);
      if (!user) {
        console.warn(`[ORDER] User not found for address saving`, { userId });
      } else {
        // Normalize addresses for comparison
        const normalizeAddress = (addr) => {
          return {
            fullName: addr.fullName?.toLowerCase().trim().replace(/\s+/g, ' '),
            addressLine1: addr.addressLine1?.toLowerCase().trim().replace(/\s+/g, ' '),
            addressLine2: addr.addressLine2?.toLowerCase().trim().replace(/\s+/g, ' ') || '',
            city: addr.city?.toLowerCase().trim(),
            state: addr.state?.toLowerCase().trim(),
            postalCode: addr.postalCode?.toLowerCase().trim().replace(/\s+/g, ''),
            country: addr.country?.toLowerCase().trim(),
            phone: addr.phone?.replace(/\D/g, '') // Remove non-digit characters
          };
        };

        const newAddressNormalized = normalizeAddress(finalShippingAddress);

        // Check if address already exists
        const addressExists = user.addresses.some(addr => {
          const existingAddrNormalized = normalizeAddress(addr);
          return (
            existingAddrNormalized.fullName === newAddressNormalized.fullName &&
            existingAddrNormalized.addressLine1 === newAddressNormalized.addressLine1 &&
            existingAddrNormalized.city === newAddressNormalized.city &&
            existingAddrNormalized.state === newAddressNormalized.state &&
            existingAddrNormalized.postalCode === newAddressNormalized.postalCode &&
            existingAddrNormalized.country === newAddressNormalized.country &&
            existingAddrNormalized.phone === newAddressNormalized.phone
          );
        });

        if (addressExists) {
          console.log(`[ORDER] Address already exists, skipping save`, { userId });
        } else {
          console.log(`[ORDER] Saving new address`, { userId });

          // Prepare address with proper structure
          const newAddress = {
            fullName: finalShippingAddress.fullName.trim(),
            addressLine1: finalShippingAddress.addressLine1.trim(),
            addressLine2: finalShippingAddress.addressLine2?.trim() || '',
            city: finalShippingAddress.city.trim(),
            state: finalShippingAddress.state.trim(),
            postalCode: finalShippingAddress.postalCode.trim(),
            country: finalShippingAddress.country.trim(),
            phone: finalShippingAddress.phone.trim(),
            isDefault: user.addresses.length === 0 // Set as default if it's the first address
          };

          // If user has no default address, set this as default
          const hasDefaultAddress = user.addresses.some(addr => addr.isDefault);
          if (!hasDefaultAddress) {
            newAddress.isDefault = true;
          }

          try {
            // Use push instead of addToSet for better control
            user.addresses.push(newAddress);
            await user.save();
            console.log(`[ORDER] Address saved successfully`, { userId, isDefault: newAddress.isDefault });
          } catch (addressError) {
            console.error(`[ORDER] Failed to save address`, { userId, error: addressError.message });
            // Don't fail the entire order if address saving fails
          }
        }
      }
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

// =========================
// GET REVENUE STATS
// =========================
exports.getRevenueStats = async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    // Match only valid orders
    let matchStage = {
      status: { $nin: ["cancelled", "refunded"] } // ✅ exclude cancelled & refunded
    };

    // Date filtering
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    console.log("[getRevenueStats] matchStage:", matchStage);

    // Grouping by time period
    let groupStage;
    let sortStage = { _id: 1 };

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

    console.log("[getRevenueStats] aggregation result:", stats);

    ApiResponse.success(res, 200, 'Revenue stats retrieved', {
      period,
      stats
    });
  } catch (error) {
    console.error("[getRevenueStats] error:", error);
    next(error);
  }
};



// =========================
// GET PRODUCT REVENUE
// =========================
exports.getProductRevenue = async (req, res, next) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const matchStage = {
      status: { $nin: ["cancelled", "refunded"] } // ✅ exclude cancelled/refunded orders
    };

    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    console.log("[getProductRevenue] matchStage:", matchStage);

    const productStats = await Order.aggregate([
      { $match: matchStage },
      {
        $project: {
          items: {
            $filter: {
              input: "$items",
              as: "item",
              cond: { $eq: ["$$item.status", "delivered"] } // ✅ FIXED to check item-level status
            }
          }
        }
      },
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
                  $switch: {
                    branches: [
                      { case: { $eq: ["$items.variantType", "simple"] }, then: "$items.simpleProduct.price" },
                      { case: { $eq: ["$items.variantType", "color"] }, then: "$items.colorVariant.price" },
                      { case: { $eq: ["$items.variantType", "storage"] }, then: "$items.storageVariant.storageOption.price" },
                      { case: { $eq: ["$items.variantType", "size"] }, then: "$items.sizeVariant.sizeOption.price" }
                    ],
                    default: 0
                  }
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

    console.log("[getProductRevenue] aggregation result:", productStats);

    ApiResponse.success(res, 200, 'Product revenue stats retrieved', {
      products: productStats
    });
  } catch (error) {
    console.error("[getProductRevenue] error:", error);
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
        console.warn(`Product not found for item ${item.productId}, skipping stock update`);
        continue; // skip this item instead of failing
      }

      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        if (!variant) {
          console.warn(`Variant ${item.variantId} not found for product ${product.title}, skipping variant stock update`);
        } else {
          // Safely increment variant stock
          variant.stock = (Number(variant.stock) || 0) + Number(item.quantity || 0);
        }
      } else {
        // Safely increment product stock
        product.stock = (Number(product.stock) || 0) + Number(item.quantity || 0);
      }

      await product.save();
    }

    order.status = 'cancelled';
    await order.save();

    // Populate order for real-time notifications
    const io = req.app.get('socketio');
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('items.productId', 'title brand sku shippingCost images variants')
      .populate('discountId', 'code value type');

    // Emit events
    io.to(`user_${userId}`).emit('orderStatusUpdated', populatedOrder);
    io.to('adminRoom').emit('orderStatusUpdated', populatedOrder);

    ApiResponse.success(res, 200, 'Order cancelled successfully', { order: populatedOrder });

  } catch (error) {
    console.error('Cancel order error:', error);
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

    if (!fs.existsSync(path.join(__dirname, '../invoices'))) {
      fs.mkdirSync(path.join(__dirname, '../invoices'), { recursive: true });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    // TCS courier slip size (A6)
    const doc = new PDFDocument({
      margin: 10,
      size: [298, 421], // A6: 105mm x 148mm
      info: {
        Title: `Invoice-${order.orderId}`,
        Author: 'Raees Malls',
        Subject: 'Invoice',
        Keywords: 'invoice, order, receipt'
      }
    });

    doc.pipe(res);
    doc.pipe(fs.createWriteStream(filePath));

    // Generate QR
    const qrData = order.items.map(
      item => `${process.env.FRONTEND_URL}/product/${item.productId}`
    );
    const qrCodeDataURL = await generateQR(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      margin: 1,
      scale: 2
    });
    const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');

    // ==============================
    // HEADER
    // ==============================
    doc.fontSize(12).font("Helvetica-Bold").text("Raees Malls", 15, 15);
    doc.fontSize(7).font("Helvetica").text("Masjid Bazar Opposite Jamia Masjid Jaranwala", 15, 30, { width: 160 });
    doc.text("Ph: 0300-6530063", 15, 42);
    doc.text("Email: raeesmalls1@gmail.com", 15, 52);

    doc.image(qrCodeBuffer, 230, 15, { width: 50, height: 50 });
    doc.fontSize(6).text("Scan Order", 230, 70, { width: 50, align: "center" });

    // ==============================
    // SHIPPER / CONSIGNEE
    // ==============================
    const shipperBoxHeight = 60;
    const consigneeBoxHeight = 60;

    // Shipper
    doc.rect(15, 90, 130, shipperBoxHeight).stroke();
    doc.fontSize(8).font("Helvetica-Bold").text("SHIPPER", 20, 95);
    doc.fontSize(7).font("Helvetica").text("Raees Malls", 20, 110);

    // Consignee
    doc.rect(160, 90, 120, consigneeBoxHeight).stroke();
    doc.fontSize(8).font("Helvetica-Bold").text("CONSIGNEE", 165, 95);

    let yConsignee = 110; // starting y position inside box
    doc.fontSize(7).font("Helvetica")
      .text(order.shippingAddress.fullName, 165, yConsignee, { width: 110 });

    yConsignee += doc.heightOfString(order.shippingAddress.fullName, { width: 110 }) + 2;

    doc.text(order.shippingAddress.addressLine1, 165, yConsignee, { width: 110 });
    yConsignee += doc.heightOfString(order.shippingAddress.addressLine1, { width: 110 }) + 2;

    // ✅ Add phone number after address
    if (order.shippingAddress.phone) {
      doc.text(`Ph: ${order.shippingAddress.phone}`, 165, yConsignee, { width: 110 });
    }


    // ==============================
    // ORDER DETAILS
    // ==============================
    doc.rect(15, 150, 265, 35).stroke();
    doc.fontSize(7).fillColor("black");
    doc.text(`Order #: ${order.orderId}`, 20, 155);
    doc.text(`Date: ${order.createdAt.toLocaleDateString()}`, 20, 165);
    doc.text(`Status: ${order.status}`, 160, 155);

    // ==============================
    // ITEMS
    // ==============================
    let itemY = 195;
    doc.rect(15, itemY, 265, 15).fillAndStroke("#f5f5f5", "black");
    doc.fillColor("black").fontSize(7).font("Helvetica-Bold")
      .text("Item", 20, itemY + 4)
      .text("Qty", 200, itemY + 4)
      .text("Total", 240, itemY + 4);

    itemY += 18;
    order.items.slice(0, 5).forEach(item => { // Limit items (slip style)
      const itemDetails = calculateItemDetails(item);

      doc.font("Helvetica").fontSize(7).fillColor("black")
        .text(item.itemName.substring(0, 20), 20, itemY)
        .text(itemDetails.quantity.toString(), 200, itemY)
        .text(`PKR ${itemDetails.itemTotal.toFixed(0)}`, 240, itemY);

      itemY += 12;
    });

    if (order.items.length > 5) {
      doc.fontSize(6).fillColor("gray").text(`+ ${order.items.length - 5} more items online`, 20, itemY);
      itemY += 10;
    }

    // ==============================
    // SUMMARY
    // ==============================
    doc.rect(15, itemY + 5, 265, 40).stroke();
    doc.font("Helvetica").fontSize(7).fillColor("black")
      .text(`Subtotal: PKR ${order.subtotal.toFixed(0)}`, 20, itemY + 10)
      .text(`Shipping: PKR ${order.totalShippingCost.toFixed(0)}`, 20, itemY + 20);

    if (order.discountAmount && order.discountAmount > 0) {
      doc.fillColor("red").text(`Discount: -PKR ${order.discountAmount.toFixed(0)}`, 20, itemY + 30);
    }

    doc.font("Helvetica-Bold").fontSize(8).fillColor("black")
      .text(`Total: PKR ${order.totalAmount.toFixed(0)}`, 180, itemY + 20);

    // ==============================
    // PAYMENT
    // ==============================
    const paymentY = itemY + 55;
    doc.rect(15, paymentY, 265, 20).stroke();
    doc.font("Helvetica-Bold").fontSize(7).text("Payment:", 20, paymentY + 6);
    doc.font("Helvetica").fontSize(7).text(
      order.paymentMethod.split("_").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" "),
      80,
      paymentY + 6
    );

    // ==============================
    // FOOTER
    // ==============================
    doc.fontSize(7).font("Helvetica-Bold").text("Thank you for shopping with us!", 0, 400, { align: "center" });

    doc.end();

    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);

  } catch (error) {
    next(error);
  }
};