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
const CryptoJS = require('crypto-js');
const axios = require('axios');

// Add this helper function
const generateQR = async (text, options) => {
  return await QRCode.toDataURL(text, options);
};

const ALFA_CONFIG = {
  MERCHANT_ID: process.env.ALFA_MERCHANT_ID || '32892',
  STORE_ID: process.env.ALFA_STORE_ID || '221340',
  MERCHANT_USERNAME: process.env.ALFA_MERCHANT_USERNAME || 'yvebyg',
  MERCHANT_PASSWORD: process.env.ALFA_MERCHANT_PASSWORD || 'ZV5nStIOaIpvFzk4yqF7CA==',
  MERCHANT_HASH: process.env.ALFA_MERCHANT_HASH_KEY || 'OUU362MB1urjt7KPP4CIHFLpyWkhnEJyWM+XCFLfdDDgfJ0w/q3C5MVwUTLJj8PxWnraQMdi41rl/Nqd8fzVKg==',

  // ✅ CORRECTED ENCRYPTION KEYS
  ENCRYPTION_KEY1: process.env.ALFA_ENCRYPTION_KEY1 || 'jER4KHU8tXvkagBZ',
  ENCRYPTION_KEY2: process.env.ALFA_ENCRYPTION_KEY2 || '4592696966857297',

  RETURN_URL: process.env.ALFA_RETURN_URL || `${process.env.BACKEND_URL}/api/orders/payment/return`,
  LISTENER_URL: process.env.ALFA_LISTENER_URL || `${process.env.BACKEND_URL}/api/orders/payment/ipn`,

  HANDSHAKE_URL: process.env.ALFA_HANDSHAKE_URL || 'https://sandbox.bankalfalah.com/HS/HS/HS',
  TRANSACTION_URL: process.env.ALFA_TRANSACTION_URL || 'https://sandbox.bankalfalah.com/HS/api/HSAPI/PaymentRequest',
  PROCESS_TRANSACTION_URL: process.env.ALFA_PROCESS_TRANSACTION_URL || 'https://sandbox.bankalfalah.com/HS/api/HSAPI/ProcessRequest',
  PAGE_REDIRECTION_URL: process.env.ALFA_PAGE_REDIRECTION_URL || 'https://sandbox.bankalfalah.com/SSO/SSO/SSO',

  CHANNEL_ID: process.env.ALFA_CHANNEL_ID || '1001',
  DEFAULT_CURRENCY: 'PKR'
};


// Helper function to generate AES encrypted hash for Bank Alfalah
const generateAlfaRequestHash = (formData, isHandshake = false) => {
  try {
    console.log('[ALFA_HASH] Generating request hash', { 
      isHandshake, 
      fieldsCount: Object.keys(formData).length,
      fields: Object.keys(formData)
    });
    
    let mapString = '';
    
    if (isHandshake) {
      // CRITICAL: Order matters! Match Bank Alfalah documentation
      const fields = [
        'HS_ChannelId',
        'HS_MerchantId',
        'HS_StoreId',
        'HS_ReturnURL',
        'HS_MerchantHash',
        'HS_MerchantUsername',
        'HS_MerchantPassword',
        'HS_IsRedirectionRequest',
        'HS_TransactionReferenceNumber'
      ];

      fields.forEach(field => {
        if (formData[field] !== undefined && formData[field] !== null) {
          mapString += `${field}=${formData[field]}&`;
        }
      });
    } else {
      // Payment fields order
      const fields = [
        'AuthToken',
        'ChannelId',
        'Currency',
        'IsBIN',
        'ReturnURL',
        'MerchantId',
        'StoreId',
        'MerchantHash',
        'MerchantUsername',
        'MerchantPassword',
        'TransactionTypeId',
        'TransactionReferenceNumber',
        'TransactionAmount'
      ];

      fields.forEach(field => {
        if (formData[field] !== undefined && formData[field] !== null) {
          mapString += `${field}=${formData[field]}&`;
        }
      });
    }
    
    // Remove trailing '&'
    mapString = mapString.slice(0, -1);
    
    console.log('[ALFA_HASH] Map string:', mapString);
    
    // Encrypt using AES-CBC
    const encrypted = CryptoJS.AES.encrypt(
      CryptoJS.enc.Utf8.parse(mapString),
      CryptoJS.enc.Utf8.parse(ALFA_CONFIG.ENCRYPTION_KEY1),
      {
        keySize: 128 / 8,
        iv: CryptoJS.enc.Utf8.parse(ALFA_CONFIG.ENCRYPTION_KEY2),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const encryptedString = encrypted.toString();
    console.log('[ALFA_HASH] ✅ Encrypted hash generated (length:', encryptedString.length, ')');
    
    return encryptedString;
  } catch (error) {
    console.error('[ALFA_HASH] ❌ Error generating hash:', error);
    throw new Error('Failed to generate payment hash');
  }
};


// FIXED STEP 1: Handshake Request
const performHandshake = async (orderId) => {
  try {
    console.log('[ALFA_HANDSHAKE] Starting handshake', { orderId });

    const handshakeData = {
      HS_ChannelId: ALFA_CONFIG.CHANNEL_ID,
      HS_MerchantId: ALFA_CONFIG.MERCHANT_ID,
      HS_StoreId: ALFA_CONFIG.STORE_ID,
      HS_ReturnURL: ALFA_CONFIG.RETURN_URL,
      HS_MerchantHash: ALFA_CONFIG.MERCHANT_HASH,
      HS_MerchantUsername: ALFA_CONFIG.MERCHANT_USERNAME,
      HS_MerchantPassword: ALFA_CONFIG.MERCHANT_PASSWORD,
      HS_IsRedirectionRequest: '0', // 0 = API call (get AuthToken in response)
      HS_TransactionReferenceNumber: orderId
    };

    // Generate hash
    const hashData = { ...handshakeData };
    handshakeData.HS_RequestHash = generateAlfaRequestHash(hashData, true);

    console.log('[ALFA_HANDSHAKE] Complete RequestHash:', handshakeData.HS_RequestHash);
    console.log('[ALFA_HANDSHAKE] Hash length:', handshakeData.HS_RequestHash.length);

    // ✅ CRITICAL: Use application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    Object.keys(handshakeData).forEach(key => {
      formData.append(key, handshakeData[key]);
    });

    console.log('[ALFA_HANDSHAKE] Making request to:', ALFA_CONFIG.HANDSHAKE_URL);
    
    const response = await axios.post(
      ALFA_CONFIG.HANDSHAKE_URL, 
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      }
    );

    console.log('[ALFA_HANDSHAKE] Response Status:', response.status);
    console.log('[ALFA_HANDSHAKE] Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.success === 'true' && response.data.AuthToken) {
      console.log('[ALFA_HANDSHAKE] ✅ Success! AuthToken received');
      return {
        success: true,
        authToken: response.data.AuthToken,
        returnURL: response.data.ReturnURL
      };
    } else {
      console.error('[ALFA_HANDSHAKE] ❌ Failed', response.data);
      return {
        success: false,
        error: response.data.ErrorMessage || response.data.Message || 'Handshake failed'
      };
    }

  } catch (error) {
    console.error('[ALFA_HANDSHAKE] ❌ Exception:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return {
      success: false,
      error: error.response?.data?.Message || error.response?.data?.ErrorMessage || error.message
    };
  }
};


// FIXED STEP 2: Generate Page Redirection Form
const generateAlfaPaymentForm = async (order, paymentMethod, authToken) => {
  try {
    const transactionId = order.orderId;
    const transactionAmount = order.totalAmount.toFixed(2);

    console.log('[ALFA_PAYMENT] Generating payment form', { 
      paymentMethod, 
      orderId: order.orderId,
      transactionAmount,
      hasAuthToken: !!authToken
    });

    if (!authToken) {
      throw new Error('AuthToken is required for payment form generation');
    }

    // Map payment method to transaction type
    const transactionTypeMap = {
      'alfa_wallet': '1',
      'alfalah_bank': '2',
      'credit_card': '3',
      'debit_card': '3'
    };

    const transactionTypeId = transactionTypeMap[paymentMethod];
    if (!transactionTypeId) {
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    // Prepare payment form data
    const formData = {
      AuthToken: authToken, // CRITICAL: Include AuthToken from handshake
      ChannelId: ALFA_CONFIG.CHANNEL_ID,
      Currency: ALFA_CONFIG.DEFAULT_CURRENCY,
      IsBIN: '0',
      ReturnURL: ALFA_CONFIG.RETURN_URL,
      MerchantId: ALFA_CONFIG.MERCHANT_ID,
      StoreId: ALFA_CONFIG.STORE_ID,
      MerchantHash: ALFA_CONFIG.MERCHANT_HASH,
      MerchantUsername: ALFA_CONFIG.MERCHANT_USERNAME,
      MerchantPassword: ALFA_CONFIG.MERCHANT_PASSWORD,
      TransactionTypeId: transactionTypeId,
      TransactionReferenceNumber: transactionId,
      TransactionAmount: transactionAmount
    };

    // Generate request hash for payment form
    formData.RequestHash = generateAlfaRequestHash(formData, false);

    console.log('[ALFA_PAYMENT] Form data prepared:', {
      hasAuthToken: !!formData.AuthToken,
      TransactionTypeId: formData.TransactionTypeId,
      TransactionAmount: formData.TransactionAmount,
      RequestHash: formData.RequestHash.substring(0, 50) + '...'
    });

    return {
      success: true,
      transactionId,
      formData,
      actionUrl: ALFA_CONFIG.PAGE_REDIRECTION_URL,
      requiresFormSubmission: true
    };

  } catch (error) {
    console.error('[ALFA_PAYMENT] Form generation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
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

// Updated placeOrder function with page redirection support
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
      useExistingAddress = false,
      existingAddressId,
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

          const storageVariant = product.variants.find(v => {
            if (item.storageVariant?.variantId && v._id.equals(item.storageVariant.variantId)) {
              return true;
            }

            const itemColorName = item.storageVariant?.color?.name || item.storageVariant?.colorName;
            if (itemColorName && v.color && v.color.name === itemColorName) {
              return true;
            }

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

    // Get user details for payment
    const user = await User.findById(userId, 'name email');

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
      paymentStatus: paymentMethod === 'cash_on_delivery' ? 'not_required' : 'pending',
      status: 'pending',
      shippingAddress: finalShippingAddress
    });

    // Attach user email to order for payment processing
    order.userId = user;

// --- PAYMENT PROCESSING ---
let paymentResponse = null;

if (paymentMethod !== 'cash_on_delivery') {
  console.log(`[ORDER] Processing online payment`, { paymentMethod, orderId: order.orderId });

  // Use page redirection for ALL Bank Alfalah payment methods
  if (['alfa_wallet', 'alfalah_bank', 'credit_card', 'debit_card'].includes(paymentMethod)) {
    
    // STEP 1: Perform handshake to get AuthToken
    console.log(`🟡 [ALFA] Starting handshake process`, { orderId: order.orderId });
    
    try {
      console.log(`🪵 [ALFA DEBUG] Calling performHandshake()`);
      const handshakeResult = await performHandshake(order.orderId);

      console.log(`🪵 [ALFA DEBUG] Handshake response:`, handshakeResult);

      if (!handshakeResult.success) {
        console.error(`🔴 [ALFA] Handshake failed`, { error: handshakeResult.error });
        throw new ApiError(500, `Payment handshake failed: ${handshakeResult.error}`);
      }

      console.log(`🟢 [ALFA] Handshake successful`, {
        hasAuthToken: !!handshakeResult.authToken,
        authTokenLength: handshakeResult.authToken?.length,
        orderId: order.orderId
      });

      // STEP 2: Generate payment form with AuthToken
      console.log(`🟡 [ALFA] Generating payment form`, {
        orderId: order.orderId,
        authToken: handshakeResult.authToken?.substring(0, 10) + '...'
      });

      const paymentFormStart = Date.now();
      paymentResponse = await generateAlfaPaymentForm(order, paymentMethod, handshakeResult.authToken);

      const paymentFormTime = Date.now() - paymentFormStart;

      console.log(`🪵 [ALFA DEBUG] Payment form response time: ${paymentFormTime}ms`);
      console.log(`🪵 [ALFA DEBUG] Payment form response:`, paymentResponse);

      if (!paymentResponse.success) {
        console.error(`🔴 [ALFA] Payment initiation failed`, { error: paymentResponse.error });
        throw new ApiError(500, `Payment initiation failed: ${paymentResponse.error}`);
      }

      // Save transaction details including AuthToken
      order.alfaPayment = {
        transactionId: paymentResponse.transactionId,
        transactionDate: new Date(),
        merchantId: ALFA_CONFIG.MERCHANT_ID,
        storeId: ALFA_CONFIG.STORE_ID,
        paymentChannel: paymentMethod,
        basketId: order.orderId,
        authToken: handshakeResult.authToken,
        formData: paymentResponse.formData
      };

      console.log(`🟢 [ALFA] Payment initiation completed`, {
        transactionId: paymentResponse.transactionId,
        orderId: order.orderId,
        actionUrl: paymentResponse.actionUrl
      });

    } catch (err) {
      console.error(`🔴 [ALFA ERROR] Payment flow failed`, {
        message: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
        url: err.config?.url
      });
      throw err;
    }

  } else {
    // Invalid payment method
    console.error(`🔴 [ORDER] Invalid payment method`, { paymentMethod });
    throw new ApiError(400, `Invalid payment method: ${paymentMethod}`);
  }

  // Save order with pending payment status (don't reduce stock yet)
  await order.save();
  console.log(`[ORDER] Order created with pending payment`, { orderId: order.orderId });

  // Return payment initiation details for page redirection
  return ApiResponse.success(res, 201, 'Payment required to complete order', {
    order: {
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      status: order.status,
      paymentMethod: order.paymentMethod
    },
    payment: {
      method: paymentMethod,
      transactionId: paymentResponse.transactionId,
      requiresFormSubmission: true,
      formData: paymentResponse.formData,
      actionUrl: paymentResponse.actionUrl,
      encryptionKeys: {
        key1: ALFA_CONFIG.ENCRYPTION_KEY1,
        key2: ALFA_CONFIG.ENCRYPTION_KEY2
      }
    },
    requiresPayment: true,
    message: "Please complete payment to confirm your order"
  });
}


    // --- COD ORDERS: Process immediately ---
    await order.save();
    console.log(`[ORDER] Order saved successfully`, { orderId: order.orderId, userId });

    // Update stock for COD orders
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

    // --- Address Saving Logic (only for COD) ---
    if (saveAddress && !useExistingAddress) {
      console.log(`[ORDER] Processing address save request`, { userId });

      const userForAddress = await User.findById(userId);
      if (!userForAddress) {
        console.warn(`[ORDER] User not found for address saving`, { userId });
      } else {
        const normalizeAddress = (addr) => {
          return {
            fullName: addr.fullName?.toLowerCase().trim().replace(/\s+/g, ' '),
            addressLine1: addr.addressLine1?.toLowerCase().trim().replace(/\s+/g, ' '),
            addressLine2: addr.addressLine2?.toLowerCase().trim().replace(/\s+/g, ' ') || '',
            city: addr.city?.toLowerCase().trim(),
            state: addr.state?.toLowerCase().trim(),
            postalCode: addr.postalCode?.toLowerCase().trim().replace(/\s+/g, ''),
            country: addr.country?.toLowerCase().trim(),
            phone: addr.phone?.replace(/\D/g, '')
          };
        };

        const newAddressNormalized = normalizeAddress(finalShippingAddress);

        const addressExists = userForAddress.addresses.some(addr => {
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

          const newAddress = {
            fullName: finalShippingAddress.fullName.trim(),
            addressLine1: finalShippingAddress.addressLine1.trim(),
            addressLine2: finalShippingAddress.addressLine2?.trim() || '',
            city: finalShippingAddress.city.trim(),
            state: finalShippingAddress.state.trim(),
            postalCode: finalShippingAddress.postalCode.trim(),
            country: finalShippingAddress.country.trim(),
            phone: finalShippingAddress.phone.trim(),
            isDefault: userForAddress.addresses.length === 0
          };

          const hasDefaultAddress = userForAddress.addresses.some(addr => addr.isDefault);
          if (!hasDefaultAddress) {
            newAddress.isDefault = true;
          }

          try {
            userForAddress.addresses.push(newAddress);
            await userForAddress.save();
            console.log(`[ORDER] Address saved successfully`, { userId, isDefault: newAddress.isDefault });
          } catch (addressError) {
            console.error(`[ORDER] Failed to save address`, { userId, error: addressError.message });
          }
        }
      }
    }

    // --- Notifications for COD orders ---
    console.log(`[ORDER] Sending notifications`, { orderId: order.orderId });
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

    // IMPORTANT: Different response for COD orders
    ApiResponse.success(res, 201, 'Order placed successfully', {
      order: populatedOrder,
      notification: notificationData,
      requiresPayment: false,
      message: "Order placed successfully! Payment will be collected on delivery."
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

// NEW: Handle Alfa Payment IPN (Instant Payment Notification)
exports.handlePaymentIPN = async (req, res, next) => {
  try {
    console.log('[PAYMENT_IPN] Received IPN notification', req.body);

    const {
      handshake_key,
      transaction_id,
      transaction_status,
      transaction_amount,
      transaction_date,
      response_code,
      response_message,
      basket_id
    } = req.body;

    // Verify handshake key
    const expectedHash = crypto.createHash('sha256')
      .update(`${ALFA_CONFIG.MERCHANT_HASH}${transaction_amount}${transaction_id}`)
      .digest('hex');

    if (handshake_key !== expectedHash) {
      console.error('[PAYMENT_IPN] Invalid handshake key');
      return res.status(400).json({ success: false, message: 'Invalid handshake key' });
    }

    // Find order by basket ID or transaction ID
    const order = await Order.findOne({
      $or: [
        { orderId: basket_id },
        { 'alfaPayment.transactionId': transaction_id }
      ]
    }).populate('userId', 'name email');

    if (!order) {
      console.error('[PAYMENT_IPN] Order not found', { basket_id, transaction_id });
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log('[PAYMENT_IPN] Processing payment for order', { orderId: order.orderId });

    // Update payment information
    await order.updatePaymentFromIPN({
      handshake_key,
      transaction_id,
      transaction_status,
      transaction_amount,
      transaction_date,
      response_code,
      response_message
    });

    // If payment is successful, process the order
    if (response_code === '00' || transaction_status === 'success') {
      console.log('[PAYMENT_IPN] Payment successful, processing order', { orderId: order.orderId });

      // Update stock for successful payments
      const productsToUpdate = [];
      
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        let stockToReduce;

        switch (item.variantType) {
          case 'simple':
            stockToReduce = { productId: product._id, quantity: item.simpleProduct.quantity };
            break;
          case 'color':
            stockToReduce = { 
              productId: product._id, 
              variantId: item.colorVariant.variantId, 
              quantity: item.colorVariant.quantity, 
              path: 'variants.$.stock' 
            };
            break;
          case 'storage':
            stockToReduce = {
              productId: product._id,
              variantId: item.storageVariant.variantId,
              storageOptionId: item.storageVariant.storageOption._id,
              quantity: item.storageVariant.quantity,
              path: 'variants.$[v].storageOptions.$[s].stock'
            };
            break;
          case 'size':
            stockToReduce = {
              productId: product._id,
              variantId: item.sizeVariant.variantId,
              sizeOptionId: item.sizeVariant.sizeOption._id,
              quantity: item.sizeVariant.quantity,
              path: 'variants.$[v].sizeOptions.$[s].stock'
            };
            break;
        }

        productsToUpdate.push(stockToReduce);
      }

      // Update stock
      for (const update of productsToUpdate) {
        try {
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
          console.error(`[PAYMENT_IPN] Failed to update stock`, { update, error: stockError.message });
        }
      }

      // Send notifications
      const io = req.app.get('socketio');
      if (io) {
        const notificationData = {
          id: uuidv4(),
          title: '✅ Payment Successful!',
          message: `${order.userId?.name || 'A customer'} completed payment for order #${order.orderId}`,
          type: 'payment',
          orderId: order.orderId,
          orderTotal: order.totalAmount,
          itemCount: order.items.length,
          timestamp: new Date().toISOString(),
          customerName: order.userId?.name || 'Customer',
          customerEmail: order.userId?.email
        };

        io.emit('orderNotification', notificationData);
        io.to('adminRoom').emit('newOrder', { order, notification: notificationData });
        io.to(`user_${order.userId._id}`).emit('paymentSuccess', { order });
      }

      console.log('[PAYMENT_IPN] Order processed successfully', { orderId: order.orderId });
    } else {
      console.log('[PAYMENT_IPN] Payment failed', { orderId: order.orderId, response_code, response_message });
      
      // Send failure notification
      const io = req.app.get('socketio');
      if (io) {
        io.to(`user_${order.userId._id}`).emit('paymentFailed', { 
          order,
          message: response_message 
        });
      }
    }

    res.status(200).json({ success: true, message: 'IPN processed successfully' });

  } catch (error) {
    console.error('[PAYMENT_IPN] Error processing IPN', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// FIXED: Handle Payment Return with proper status handling
exports.handlePaymentReturn = async (req, res, next) => {
  try {
    console.log('[PAYMENT_RETURN] ========== START ==========');
    console.log('[PAYMENT_RETURN] Full URL:', req.originalUrl);
    console.log('[PAYMENT_RETURN] Query params:', JSON.stringify(req.query, null, 2));
    console.log('[PAYMENT_RETURN] Body params:', JSON.stringify(req.body, null, 2));

    // ✅ Bank Alfalah can send params in query OR body
    const params = { ...req.query, ...req.body };
    
    console.log('[PAYMENT_RETURN] All parameters:', params);

    // ✅ Extract all possible parameter variations
    const responseCode = params.RC || params.response_code || params.ResponseCode || params.code;
    const responseDescription = params.RD || params.response_description || params.ResponseDescription || params.message;
    const transactionStatus = params.TS || params.transaction_status || params.TransactionStatus || params.status;
    const orderId = params.O || params.order_id || params.OrderId || params.basket_id || params.TransactionReferenceNumber;
    const transactionId = params.TID || params.transaction_id || params.TransactionId;
    const authToken = params.AuthToken || params.auth_token;
    const transactionAmount = params.TA || params.transaction_amount || params.TransactionAmount;

    console.log('[PAYMENT_RETURN] Extracted values:', {
      responseCode,
      responseDescription,
      transactionStatus,
      orderId,
      transactionId,
      authToken: authToken ? 'present' : 'missing',
      transactionAmount
    });

    // ✅ Validate order ID
    if (!orderId) {
      console.error('[PAYMENT_RETURN] ❌ No order ID found in any parameter');
      console.error('[PAYMENT_RETURN] Available params:', Object.keys(params));
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/return?status=error&error=missing_order_id&message=${encodeURIComponent('Order ID not found in payment response')}`
      );
    }

    // ✅ Find order - FIXED: Use proper query
    console.log('[PAYMENT_RETURN] Searching for order:', orderId);
    
    // Try multiple lookup strategies
    let order = await Order.findOne({ orderId: orderId })
      .populate('userId', 'name email');

    if (!order) {
      // Try with transaction ID
      order = await Order.findOne({ 'alfaPayment.transactionId': orderId })
        .populate('userId', 'name email');
    }

    if (!order) {
      // Try with basket ID
      order = await Order.findOne({ 'alfaPayment.basketId': orderId })
        .populate('userId', 'name email');
    }

    if (!order) {
      console.error('[PAYMENT_RETURN] ❌ Order not found:', orderId);
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/return?status=error&error=order_not_found&orderId=${orderId}`
      );
    }

    console.log('[PAYMENT_RETURN] ✅ Order found:', {
      orderId: order.orderId,
      currentStatus: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount
    });

    // ✅ ENHANCED: Multiple success indicators
    const successIndicators = [
      responseCode === '00',
      responseCode === '000',
      responseCode === '0',
      transactionStatus === 'S',
      transactionStatus === 'success',
      transactionStatus === 'Success',
      transactionStatus === 'SUCCESS',
      responseDescription && responseDescription.toLowerCase().includes('success'),
      responseDescription && responseDescription.toLowerCase().includes('approved'),
      responseDescription && responseDescription.toLowerCase().includes('completed'),
      params.status === 'success'
    ];

    const isSuccess = successIndicators.some(indicator => indicator === true);

    console.log('[PAYMENT_RETURN] Success analysis:', {
      responseCode,
      transactionStatus,
      responseDescription,
      successIndicators,
      finalDecision: isSuccess ? 'SUCCESS' : 'FAILED'
    });

    // ✅ Update order based on payment result - FIXED STATUS VALUES
    if (isSuccess) {
      console.log('[PAYMENT_RETURN] ✅ Processing successful payment...');
      
      // Only update if not already completed
      if (order.paymentStatus !== 'completed') {
        order.paymentStatus = 'completed';
        // Don't change order status - let admin handle order processing
        // order.status remains as 'pending' or whatever it was
        
        // Update Alfa payment details
        order.alfaPayment.responseCode = responseCode;
        order.alfaPayment.responseMessage = responseDescription;
        order.alfaPayment.transactionId = transactionId || order.alfaPayment.transactionId;
        
        console.log('[PAYMENT_RETURN] ✅ Payment marked as completed');
        
        // Update stock only if payment is newly completed
        await updateOrderStock(order);
        console.log('[PAYMENT_RETURN] ✅ Stock updated');
      } else {
        console.log('[PAYMENT_RETURN] ℹ️ Order already marked as completed');
      }
      
    } else {
      console.log('[PAYMENT_RETURN] ❌ Processing failed payment...');
      order.paymentStatus = 'failed';
      order.status = 'payment_failed'; // This status exists in your model
      
      // Update Alfa payment details for failure
      order.alfaPayment.responseCode = responseCode;
      order.alfaPayment.responseMessage = responseDescription;
    }

    // ✅ Save payment attempt with ALL parameters for debugging
    if (!order.alfaPayment.paymentAttempts) {
      order.alfaPayment.paymentAttempts = [];
    }

    const paymentAttempt = {
      attemptDate: new Date(),
      status: isSuccess ? 'success' : 'failed',
      responseCode: responseCode || 'N/A',
      responseMessage: responseDescription || 'No message',
      transactionId: transactionId || 'N/A',
      transactionStatus: transactionStatus || 'N/A',
      transactionAmount: transactionAmount,
      authToken: authToken ? 'present' : 'missing',
      gatewayParams: params, // Store ALL params for debugging
      rawUrl: req.originalUrl
    };

    order.alfaPayment.paymentAttempts.push(paymentAttempt);

    // Update latest transaction
    order.alfaPayment.latestTransaction = {
      transactionId: transactionId || 'N/A',
      transactionDate: new Date(),
      amount: transactionAmount || order.totalAmount,
      status: isSuccess ? 'success' : 'failed',
      responseCode: responseCode || 'N/A',
      responseMessage: responseDescription || 'No message'
    };

    await order.save();
    console.log('[PAYMENT_RETURN] ✅ Order saved with payment details');

    // ✅ Send notifications for successful payment
    if (isSuccess) {
      const io = req.app.get('socketio');
      if (io) {
        const notificationData = {
          id: require('uuid').v4(),
          title: '✅ Payment Successful!',
          message: `${order.userId?.name || 'Customer'} completed payment for order #${order.orderId}`,
          type: 'payment',
          orderId: order.orderId,
          orderTotal: order.totalAmount,
          itemCount: order.items.length,
          timestamp: new Date().toISOString(),
          customerName: order.userId?.name || 'Customer',
          customerEmail: order.userId?.email
        };

        io.emit('orderNotification', notificationData);
        io.to('adminRoom').emit('newOrder', { order, notification: notificationData });
        if (order.userId?._id) {
          io.to(`user_${order.userId._id}`).emit('paymentSuccess', { order });
        }
        
        console.log('[PAYMENT_RETURN] ✅ Notifications sent');
      }
    }

    // ✅ Redirect to frontend with proper parameters
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/payment/return`);
    
    if (isSuccess) {
      redirectUrl.searchParams.set('status', 'success');
      redirectUrl.searchParams.set('orderId', order.orderId);
      redirectUrl.searchParams.set('transactionId', transactionId || order.alfaPayment.transactionId || 'N/A');
      redirectUrl.searchParams.set('amount', order.totalAmount);
      redirectUrl.searchParams.set('responseCode', responseCode || '00');
    } else {
      redirectUrl.searchParams.set('status', 'failed');
      redirectUrl.searchParams.set('orderId', order.orderId);
      redirectUrl.searchParams.set('code', responseCode || 'ERROR');
      redirectUrl.searchParams.set('message', encodeURIComponent(responseDescription || 'Payment failed'));
    }

    console.log('[PAYMENT_RETURN] Redirecting to:', redirectUrl.toString());
    console.log('[PAYMENT_RETURN] ========== END ==========');
    
    return res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('[PAYMENT_RETURN] ❌ Exception:', {
      message: error.message,
      stack: error.stack,
      query: req.query,
      body: req.body
    });
    
    return res.redirect(
      `${process.env.FRONTEND_URL}/payment/return?status=error&message=${encodeURIComponent(error.message || 'Payment processing error')}`
    );
  }
};

// Helper function to update stock after successful payment
const updateOrderStock = async (order) => {
  try {
    console.log('[UPDATE_STOCK] Updating stock for order:', order.orderId);

    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        console.warn(`[UPDATE_STOCK] Product not found: ${item.productId}`);
        continue;
      }

      switch (item.variantType) {
        case 'simple':
          await Product.findByIdAndUpdate(product._id, { 
            $inc: { stock: -item.simpleProduct.quantity } 
          });
          console.log('[UPDATE_STOCK] Simple product updated');
          break;

        case 'color':
          await Product.updateOne(
            { _id: product._id, 'variants._id': item.colorVariant.variantId },
            { $inc: { 'variants.$.stock': -item.colorVariant.quantity } }
          );
          console.log('[UPDATE_STOCK] Color variant updated');
          break;

        case 'storage':
          await Product.updateOne(
            { _id: product._id },
            { $inc: { 'variants.$[v].storageOptions.$[s].stock': -item.storageVariant.quantity } },
            { 
              arrayFilters: [
                { 'v._id': item.storageVariant.variantId }, 
                { 's._id': item.storageVariant.storageOption._id }
              ] 
            }
          );
          console.log('[UPDATE_STOCK] Storage variant updated');
          break;

        case 'size':
          await Product.updateOne(
            { _id: product._id },
            { $inc: { 'variants.$[v].sizeOptions.$[s].stock': -item.sizeVariant.quantity } },
            { 
              arrayFilters: [
                { 'v._id': item.sizeVariant.variantId }, 
                { 's._id': item.sizeVariant.sizeOption._id }
              ] 
            }
          );
          console.log('[UPDATE_STOCK] Size variant updated');
          break;
      }
    }

    console.log('[UPDATE_STOCK] ✅ Stock update completed');
  } catch (error) {
    console.error('[UPDATE_STOCK] Error updating stock:', error);
    throw error;
  }
};

// NEW: Sync Payment Status - Fixes payment status mismatch
exports.syncPaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    console.log('[SYNC_PAYMENT] Starting payment sync', { 
      orderId, 
      userId, 
      userRole 
    });

    // Find order with proper authorization
    let order;
    if (userRole === 'admin') {
      // Admin can sync any order
      order = await Order.findOne({ orderId })
        .populate('userId', 'name email');
    } else {
      // Users can only sync their own orders
      order = await Order.findOne({ orderId, userId })
        .populate('userId', 'name email');
    }

    if (!order) {
      console.error('[SYNC_PAYMENT] Order not found or unauthorized', { orderId, userId });
      throw new ApiError(404, 'Order not found or you do not have permission to sync this order');
    }

    console.log('[SYNC_PAYMENT] Order found', {
      orderId: order.orderId,
      currentPaymentStatus: order.paymentStatus,
      currentOrderStatus: order.status,
      paymentMethod: order.paymentMethod
    });

    // Check if we have successful payment attempts but failed status
    const successfulAttempt = order.alfaPayment?.paymentAttempts?.find(
      attempt => 
        attempt.status === 'success' || 
        attempt.responseCode === '00' ||
        (attempt.responseMessage && attempt.responseMessage.toLowerCase().includes('success')) ||
        (attempt.transactionStatus && attempt.transactionStatus.toLowerCase().includes('success'))
    );

    const failedAttempt = order.alfaPayment?.paymentAttempts?.find(
      attempt => 
        attempt.status === 'failed' || 
        (attempt.responseCode && attempt.responseCode !== '00' && attempt.responseCode !== '') ||
        (attempt.responseMessage && attempt.responseMessage.toLowerCase().includes('fail'))
    );

    console.log('[SYNC_PAYMENT] Payment analysis:', {
      hasSuccessfulAttempt: !!successfulAttempt,
      hasFailedAttempt: !!failedAttempt,
      successfulAttempt: successfulAttempt ? {
        responseCode: successfulAttempt.responseCode,
        responseMessage: successfulAttempt.responseMessage,
        transactionStatus: successfulAttempt.transactionStatus
      } : null,
      failedAttempt: failedAttempt ? {
        responseCode: failedAttempt.responseCode,
        responseMessage: failedAttempt.responseMessage
      } : null
    });

    let syncPerformed = false;
    let syncMessage = 'No sync required';

    // CASE 1: Found successful payment attempt but order shows failed
    if (successfulAttempt && order.paymentStatus === 'failed') {
      console.log('[SYNC_PAYMENT] ✅ Found successful payment attempt, updating status to completed');
      
      order.paymentStatus = 'completed';
      order.status = 'confirmed';
      syncPerformed = true;
      syncMessage = 'Payment status synced successfully - payment confirmed';

      // Update stock for successful payment
      await updateOrderStock(order);
      
      console.log('[SYNC_PAYMENT] ✅ Order status updated and stock reduced');

    } 
    // CASE 2: Found failed payment attempt but order shows completed (shouldn't happen but handle it)
    else if (failedAttempt && order.paymentStatus === 'completed') {
      console.log('[SYNC_PAYMENT] ⚠️ Found failed payment attempt but order shows completed, reverting status');
      
      order.paymentStatus = 'failed';
      order.status = 'payment_failed';
      syncPerformed = true;
      syncMessage = 'Payment status corrected - payment failed';

      // Restore stock since payment actually failed
      await restoreOrderStock(order);
      
      console.log('[SYNC_PAYMENT] ⚠️ Order status reverted and stock restored');
    }
    // CASE 3: Check latest transaction details for success indicators
    else if (order.alfaPayment?.latestTransaction) {
      const latestTx = order.alfaPayment.latestTransaction;
      const isLatestSuccess = 
        latestTx.status === 'success' || 
        latestTx.responseCode === '00' ||
        (latestTx.responseMessage && latestTx.responseMessage.toLowerCase().includes('success'));

      if (isLatestSuccess && order.paymentStatus !== 'completed') {
        console.log('[SYNC_PAYMENT] ✅ Latest transaction shows success, updating status');
        
        order.paymentStatus = 'completed';
        order.status = 'confirmed';
        syncPerformed = true;
        syncMessage = 'Payment status synced from latest transaction';

        await updateOrderStock(order);
      }
    }

    // Add sync attempt record
    if (!order.alfaPayment) {
      order.alfaPayment = {};
    }
    
    if (!order.alfaPayment.syncAttempts) {
      order.alfaPayment.syncAttempts = [];
    }

    order.alfaPayment.syncAttempts.push({
      syncDate: new Date(),
      performed: syncPerformed,
      message: syncMessage,
      previousPaymentStatus: order.paymentStatus,
      newPaymentStatus: syncPerformed ? order.paymentStatus : undefined,
      triggeredBy: {
        userId: userId,
        userRole: userRole
      }
    });

    // Update last synced timestamp
    order.alfaPayment.lastSyncedAt = new Date();

    await order.save();
    console.log('[SYNC_PAYMENT] Order saved with sync details');

    // Send notifications if sync was performed
    if (syncPerformed) {
      const io = req.app.get('socketio');
      if (io) {
        if (order.paymentStatus === 'completed') {
          const notificationData = {
            id: uuidv4(),
            title: '✅ Payment Synced Successfully!',
            message: `Payment for order #${order.orderId} has been confirmed via sync`,
            type: 'payment_sync',
            orderId: order.orderId,
            orderTotal: order.totalAmount,
            timestamp: new Date().toISOString(),
            customerName: order.userId?.name || 'Customer',
            customerEmail: order.userId?.email
          };

          io.emit('orderNotification', notificationData);
          io.to('adminRoom').emit('orderStatusUpdated', { order, notification: notificationData });
          io.to(`user_${order.userId._id}`).emit('paymentSuccess', { order });
          
          console.log('[SYNC_PAYMENT] ✅ Notifications sent for successful sync');
        }
      }
    }

    console.log('[SYNC_PAYMENT] Sync completed', {
      orderId: order.orderId,
      syncPerformed,
      syncMessage,
      finalPaymentStatus: order.paymentStatus,
      finalOrderStatus: order.status
    });

    return ApiResponse.success(res, 200, syncMessage, {
      order: {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        status: order.status,
        syncPerformed,
        syncMessage
      },
      analysis: {
        hasSuccessfulAttempt: !!successfulAttempt,
        hasFailedAttempt: !!failedAttempt,
        successfulAttempt: successfulAttempt ? {
          responseCode: successfulAttempt.responseCode,
          responseMessage: successfulAttempt.responseMessage
        } : null
      }
    });

  } catch (error) {
    console.error('[SYNC_PAYMENT] Error syncing payment status', {
      message: error.message,
      stack: error.stack,
      orderId: req.params.orderId,
      userId: req.user?.userId
    });
    next(error);
  }
};

// Helper function to restore stock (for case when payment actually failed but stock was reduced)
const restoreOrderStock = async (order) => {
  try {
    console.log('[RESTORE_STOCK] Restoring stock for order:', order.orderId);

    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        console.warn(`[RESTORE_STOCK] Product not found: ${item.productId}`);
        continue;
      }

      switch (item.variantType) {
        case 'simple':
          await Product.findByIdAndUpdate(product._id, { 
            $inc: { stock: item.simpleProduct.quantity } 
          });
          console.log('[RESTORE_STOCK] Simple product stock restored');
          break;

        case 'color':
          await Product.updateOne(
            { _id: product._id, 'variants._id': item.colorVariant.variantId },
            { $inc: { 'variants.$.stock': item.colorVariant.quantity } }
          );
          console.log('[RESTORE_STOCK] Color variant stock restored');
          break;

        case 'storage':
          await Product.updateOne(
            { _id: product._id },
            { $inc: { 'variants.$[v].storageOptions.$[s].stock': item.storageVariant.quantity } },
            { 
              arrayFilters: [
                { 'v._id': item.storageVariant.variantId }, 
                { 's._id': item.storageVariant.storageOption._id }
              ] 
            }
          );
          console.log('[RESTORE_STOCK] Storage variant stock restored');
          break;

        case 'size':
          await Product.updateOne(
            { _id: product._id },
            { $inc: { 'variants.$[v].sizeOptions.$[s].stock': item.sizeVariant.quantity } },
            { 
              arrayFilters: [
                { 'v._id': item.sizeVariant.variantId }, 
                { 's._id': item.sizeVariant.sizeOption._id }
              ] 
            }
          );
          console.log('[RESTORE_STOCK] Size variant stock restored');
          break;
      }
    }

    console.log('[RESTORE_STOCK] ✅ Stock restoration completed');
  } catch (error) {
    console.error('[RESTORE_STOCK] Error restoring stock:', error);
    throw error;
  }
};

// NEW: Get payment sync history
exports.getPaymentSyncHistory = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    let order;
    if (userRole === 'admin') {
      order = await Order.findOne({ orderId });
    } else {
      order = await Order.findOne({ orderId, userId });
    }

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const syncHistory = order.alfaPayment?.syncAttempts || [];

    ApiResponse.success(res, 200, 'Payment sync history retrieved', {
      orderId: order.orderId,
      syncHistory,
      lastSyncedAt: order.alfaPayment?.lastSyncedAt
    });

  } catch (error) {
    console.error('[SYNC_HISTORY] Error retrieving sync history:', error);
    next(error);
  }
};

// NEW: Check payment status
exports.checkPaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.userId;

    const order = await Order.findOne({ orderId, userId })
      .populate('userId', 'name email')
      .populate('discountId', 'code value type');

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    ApiResponse.success(res, 200, 'Payment status retrieved', {
      order: {
        orderId: order.orderId,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        totalAmount: order.totalAmount,
        alfaPayment: order.alfaPayment,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
};

// NEW: Retry failed payment
exports.retryPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.userId;

    const order = await Order.findOne({ orderId, userId })
      .populate('userId', 'name email');

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.paymentStatus !== 'failed') {
      throw new ApiError(400, 'Only failed payments can be retried');
    }

    if (order.paymentMethod === 'cash_on_delivery') {
      throw new ApiError(400, 'Cannot retry COD payments');
    }

    console.log(`[RETRY_PAYMENT] Retrying payment for order`, { orderId: order.orderId });

    let paymentResponse = null;

    if (['alfa_wallet', 'alfalah_bank', 'credit_card', 'debit_card'].includes(order.paymentMethod)) {
      paymentResponse = await generateAlfaPaymentForm(order, order.paymentMethod);
      
      if (!paymentResponse.success) {
        throw new ApiError(500, `Payment initiation failed: ${paymentResponse.error}`);
      }

      order.alfaPayment.transactionId = paymentResponse.transactionId;
      order.alfaPayment.transactionDate = new Date();
      order.alfaPayment.formData = paymentResponse.formData;
    }

    order.paymentStatus = 'pending';
    await order.save();

    ApiResponse.success(res, 200, 'Payment retry initiated', {
      order: {
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus
      },
      payment: {
        method: order.paymentMethod,
        transactionId: paymentResponse.transactionId,
        requiresFormSubmission: true,
        formData: paymentResponse.formData,
        actionUrl: paymentResponse.actionUrl,
        encryptionKeys: {
          key1: ALFA_CONFIG.ENCRYPTION_KEY1,
          key2: ALFA_CONFIG.ENCRYPTION_KEY2
        }
      }
    });

  } catch (error) {
    console.error('[RETRY_PAYMENT] Error retrying payment', error);
    next(error);
  }
};

// ... (rest of the controller methods remain the same - getRecentOrderNotifications, getRevenueStats, getProductRevenue, getUserOrders, getAllOrders, updateOrderStatus, cancelOrder, downloadInvoice)

exports.getRecentOrderNotifications = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;

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

// NEW: Get order details by ID
exports.getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    let order;
    
    if (userRole === 'admin') {
      // Admin can see any order
      order = await Order.findOne({ orderId })
        .populate('userId', 'name email')
        .populate('items.productId', 'title brand sku images')
        .populate('discountId', 'code value type');
    } else {
      // User can only see their own orders
      order = await Order.findOne({ orderId, userId })
        .populate('userId', 'name email')
        .populate('items.productId', 'title brand sku images')
        .populate('discountId', 'code value type');
    }

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    ApiResponse.success(res, 200, 'Order details retrieved successfully', {
      order
    });

  } catch (error) {
    console.error('[ORDER_DETAILS] Error retrieving order', error);
    next(error);
  }
};

exports.getRevenueStats = async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    let matchStage = {
      status: { $nin: ["cancelled", "refunded"] },
      paymentStatus: { $in: ["completed", "not_required"] }
    };

    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    console.log("[getRevenueStats] matchStage:", matchStage);

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

exports.getProductRevenue = async (req, res, next) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const matchStage = {
      status: { $nin: ["cancelled", "refunded"] },
      paymentStatus: { $in: ["completed", "not_required"] }
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
              cond: { $eq: ["$item.status", "delivered"] }
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

    // Only restore stock if payment was completed or it was COD
    if (order.paymentStatus === 'completed' || order.paymentStatus === 'not_required') {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          console.warn(`Product not found for item ${item.productId}, skipping stock update`);
          continue;
        }

        if (item.variantId) {
          const variant = product.variants.id(item.variantId);
          if (!variant) {
            console.warn(`Variant ${item.variantId} not found for product ${product.title}, skipping variant stock update`);
          } else {
            variant.stock = (Number(variant.stock) || 0) + Number(item.quantity || 0);
          }
        } else {
          product.stock = (Number(product.stock) || 0) + Number(item.quantity || 0);
        }

        await product.save();
      }
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

    const doc = new PDFDocument({
      margin: 10,
      size: [298, 421],
      info: {
        Title: `Invoice-${order.orderId}`,
        Author: 'Raees Malls',
        Subject: 'Invoice',
        Keywords: 'invoice, order, receipt'
      }
    });

    doc.pipe(res);
    doc.pipe(fs.createWriteStream(filePath));

    const qrData = order.items.map(
      item => `${process.env.FRONTEND_URL}/product/${item.productId}`
    );
    const qrCodeDataURL = await generateQR(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      margin: 1,
      scale: 2
    });
    const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');

    // HEADER
    doc.fontSize(12).font("Helvetica-Bold").text("Raees Malls", 15, 15);
    doc.fontSize(7).font("Helvetica").text("Masjid Bazar Opposite Jamia Masjid Jaranwala", 15, 30, { width: 160 });
    doc.text("Ph: 0300-6530063", 15, 42);
    doc.text("Email: raeesmalls1@gmail.com", 15, 52);

    doc.image(qrCodeBuffer, 230, 15, { width: 50, height: 50 });
    doc.fontSize(6).text("Scan Order", 230, 70, { width: 50, align: "center" });

    const shipperBoxHeight = 60;
    const consigneeBoxHeight = 60;

    // Shipper
    doc.rect(15, 90, 130, shipperBoxHeight).stroke();
    doc.fontSize(8).font("Helvetica-Bold").text("SHIPPER", 20, 95);
    doc.fontSize(7).font("Helvetica").text("Raees Malls", 20, 110);

    // Consignee
    doc.rect(160, 90, 120, consigneeBoxHeight).stroke();
    doc.fontSize(8).font("Helvetica-Bold").text("CONSIGNEE", 165, 95);

    let yConsignee = 110;
    doc.fontSize(7).font("Helvetica")
      .text(order.shippingAddress.fullName, 165, yConsignee, { width: 110 });

    yConsignee += doc.heightOfString(order.shippingAddress.fullName, { width: 110 }) + 2;

    doc.text(order.shippingAddress.addressLine1, 165, yConsignee, { width: 110 });
    yConsignee += doc.heightOfString(order.shippingAddress.addressLine1, { width: 110 }) + 2;

    if (order.shippingAddress.phone) {
      doc.text(`Ph: ${order.shippingAddress.phone}`, 165, yConsignee, { width: 110 });
    }

    // ORDER DETAILS
    doc.rect(15, 150, 265, 35).stroke();
    doc.fontSize(7).fillColor("black");
    doc.text(`Order #: ${order.orderId}`, 20, 155);
    doc.text(`Date: ${order.createdAt.toLocaleDateString()}`, 20, 165);
    doc.text(`Status: ${order.status}`, 160, 155);

    // ITEMS
    let itemY = 195;
    doc.rect(15, itemY, 265, 15).fillAndStroke("#f5f5f5", "black");
    doc.fillColor("black").fontSize(7).font("Helvetica-Bold")
      .text("Item", 20, itemY + 4)
      .text("Qty", 200, itemY + 4)
      .text("Total", 240, itemY + 4);

    itemY += 18;
    order.items.slice(0, 5).forEach(item => {
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

    // SUMMARY
    doc.rect(15, itemY + 5, 265, 40).stroke();
    doc.font("Helvetica").fontSize(7).fillColor("black")
      .text(`Subtotal: PKR ${order.subtotal.toFixed(0)}`, 20, itemY + 10)
      .text(`Shipping: PKR ${order.totalShippingCost.toFixed(0)}`, 20, itemY + 20);

    if (order.discountAmount && order.discountAmount > 0) {
      doc.fillColor("red").text(`Discount: -PKR ${order.discountAmount.toFixed(0)}`, 20, itemY + 30);
    }

    doc.font("Helvetica-Bold").fontSize(8).fillColor("black")
      .text(`Total: PKR ${order.totalAmount.toFixed(0)}`, 180, itemY + 20);

    // PAYMENT
    const paymentY = itemY + 55;
    doc.rect(15, paymentY, 265, 20).stroke();
    doc.font("Helvetica-Bold").fontSize(7).text("Payment:", 20, paymentY + 6);
    doc.font("Helvetica").fontSize(7).text(
      order.paymentMethod.split("_").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" "),
      80,
      paymentY + 6
    );

    // FOOTER
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