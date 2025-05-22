const Discount = require('../models/Discount');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const AuditLog = require('../models/AuditLog');

exports.createDiscount = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { code, description, type, value, applicableTo, productIds, categoryIds, minOrderAmount, startDate, endDate, usageLimit, isActive } = req.body;

    const discount = new Discount({
      code,
      description,
      type,
      value,
      applicableTo,
      productIds: productIds || [],
      categoryIds: categoryIds || [],
      minOrderAmount: minOrderAmount || 0,
      startDate,
      endDate,
      usageLimit: usageLimit || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    await discount.save();

    await AuditLog.create({
      userId,
      action: 'DISCOUNT_CREATE',
      details: `Discount created: ${discount._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    ApiResponse.success(res, 201, 'Discount created successfully', { discount });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, 'Discount code already exists'));
    }
    next(error);
  }
};

exports.getAllDiscounts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;

    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const discounts = await Discount.find(query)
      .populate('productIds', 'title sku')
      .populate('categoryIds', 'name slug')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Discount.countDocuments(query);

    ApiResponse.success(res, 200, 'Discounts retrieved successfully', {
      discounts,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

exports.getDiscountById = async (req, res, next) => {
  try {
    const discount = await Discount.findById(req.params.id)
      .populate('productIds', 'title sku')
      .populate('categoryIds', 'name slug');

    if (!discount) {
      throw new ApiError(404, 'Discount not found');
    }

    ApiResponse.success(res, 200, 'Discount retrieved successfully', { discount });
  } catch (error) {
    next(error);
  }
};

exports.updateDiscount = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const discount = await Discount.findById(req.params.id);
    if (!discount) {
      throw new ApiError(404, 'Discount not found');
    }

    const { code, description, type, value, applicableTo, productIds, categoryIds, minOrderAmount, startDate, endDate, usageLimit, isActive } = req.body;

    discount.code = code || discount.code;
    discount.description = description || discount.description;
    discount.type = type || discount.type;
    discount.value = value !== undefined ? value : discount.value;
    discount.applicableTo = applicableTo || discount.applicableTo;
    discount.productIds = productIds !== undefined ? productIds : discount.productIds;
    discount.categoryIds = categoryIds !== undefined ? categoryIds : discount.categoryIds;
    discount.minOrderAmount = minOrderAmount !== undefined ? minOrderAmount : discount.minOrderAmount;
    discount.startDate = startDate || discount.startDate;
    discount.endDate = endDate || discount.endDate;
    discount.usageLimit = usageLimit !== undefined ? usageLimit : discount.usageLimit;
    discount.isActive = isActive !== undefined ? isActive : discount.isActive;

    await discount.save();

    await AuditLog.create({
      userId,
      action: 'DISCOUNT_UPDATE',
      details: `Discount updated: ${discount._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    ApiResponse.success(res, 200, 'Discount updated successfully', { discount });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, 'Discount code already exists'));
    }
    next(error);
  }
};

exports.deleteDiscount = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const discount = await Discount.findById(req.params.id);
    if (!discount) {
      throw new ApiError(404, 'Discount not found');
    }

    await discount.deleteOne();

    await AuditLog.create({
      userId,
      action: 'DISCOUNT_DELETE',
      details: `Discount deleted: ${discount._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    ApiResponse.success(res, 200, 'Discount deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.applyDiscount = async (req, res, next) => {
  try {
    const { code, orderTotal, productIds } = req.body;

    const discount = await Discount.findOne({
      code,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      $or: [
        { applicableTo: 'all' },
        { applicableTo: 'products', productIds: { $in: productIds } },
        { applicableTo: 'categories', categoryIds: { $in: (await Product.find({ _id: { $in: productIds } }).distinct('categoryId')) } },
        { applicableTo: 'orders' }
      ]
    });

    if (!discount) {
      throw new ApiError(400, 'Invalid or expired discount code');
    }

    if (discount.minOrderAmount > orderTotal) {
      throw new ApiError(400, 'Order total too low for discount');
    }

    if (discount.usageLimit > 0 && discount.usedCount >= discount.usageLimit) {
      throw new ApiError(400, 'Discount usage limit reached');
    }

    const discountAmount = discount.type === 'percentage'
      ? (discount.value / 100) * orderTotal
      : Math.min(discount.value, orderTotal);

    ApiResponse.success(res, 200, 'Discount applied successfully', {
      discount: {
        id: discount._id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        discountAmount
      }
    });
  } catch (error) {
    next(error);
  }
};