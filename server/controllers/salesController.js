const Sales = require('../models/Sales');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const SALES_LIMITS = require('../config/salesConfig');

exports.createSale = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, startDate, endDate, items } = req.body;

    // Check concurrent sales limit for this type
    const activeSalesOfType = await Sales.countDocuments({
      type: type,
      status: { $in: ['active', 'scheduled'] },
      endDate: { $gte: new Date() }
    });

    if (activeSalesOfType >= SALES_LIMITS.MAX_CONCURRENT_SALES[type]) {
      return res.status(400).json({
        message: `Maximum ${SALES_LIMITS.MAX_CONCURRENT_SALES[type]} concurrent ${type.replace('_', ' ')} sales allowed`
      });
    }

    // Check total active sales limit
    const totalActiveSales = await Sales.countDocuments({
      status: { $in: ['active', 'scheduled'] },
      endDate: { $gte: new Date() }
    });

    if (totalActiveSales >= SALES_LIMITS.TOTAL_MAX_ACTIVE_SALES) {
      return res.status(400).json({
        message: `Maximum ${SALES_LIMITS.TOTAL_MAX_ACTIVE_SALES} total active sales allowed`
      });
    }

    // Check products per sale limit
    if (items.length > SALES_LIMITS.MAX_PRODUCTS_PER_SALE[type]) {
      return res.status(400).json({
        message: `Maximum ${SALES_LIMITS.MAX_PRODUCTS_PER_SALE[type]} products allowed for ${type.replace('_', ' ')} sales`
      });
    }

    // Check minimum interval between similar sales
    const recentSimilarSale = await Sales.findOne({
      type: type,
      endDate: { 
        $gte: new Date(Date.now() - SALES_LIMITS.MIN_INTERVAL_BETWEEN_SALES[type] * 60000) 
      }
    }).sort({ endDate: -1 });

    if (recentSimilarSale && new Date(startDate) < new Date(recentSimilarSale.endDate.getTime() + SALES_LIMITS.MIN_INTERVAL_BETWEEN_SALES[type] * 60000)) {
      return res.status(400).json({
        message: `Must wait ${SALES_LIMITS.MIN_INTERVAL_BETWEEN_SALES[type]} minutes after last ${type.replace('_', ' ')} sale ends`
      });
    }

    // Rest of the createSale logic...
    const saleData = {
      ...req.body,
      createdBy: req.user.id
    };

    const sale = new Sales(saleData);
    await sale.save();
    
    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: sale
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllSales = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, search } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sales = await Sales.find(query)
      .populate('items.productId', 'title images brand')
      .populate('createdBy', 'name')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sales.countDocuments(query);

    res.json({
      success: true,
      data: sales,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sales.findByIdAndUpdate(id, req.body, { 
      new: true, 
      runValidators: true 
    });
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sales.findByIdAndDelete(id);
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    res.json({ success: true, message: 'Sale deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Public Controllers
exports.getActiveSales = async (req, res) => {
  try {
    const { type, limit = 20 } = req.query;
    const now = new Date();
    
    const query = {
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
      'displaySettings.showOnHomepage': true
    };
    
    if (type) query.type = type;

    const sales = await Sales.find(query)
      .populate({
        path: 'items.productId',
        select: 'title images brand averageRating numReviews'
      })
      .sort({ priority: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sales.findById(id)
      .populate({
        path: 'items.productId',
        select: 'title description images brand specifications features'
      });
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to get product price based on variant/option
function getProductPrice(product, item) {
  if (item.variantId && item.optionType !== 'none') {
    const variant = product.variants.find(v => v.color.name === item.variantId);
    if (variant) {
      if (item.optionType === 'storage') {
        const option = variant.storageOptions.find(s => s.capacity === item.optionValue);
        return option ? option.price : variant.price || product.price;
      } else if (item.optionType === 'size') {
        const option = variant.sizeOptions.find(s => s.size === item.optionValue);
        return option ? option.price : variant.price || product.price;
      }
      return variant.price || product.price;
    }
  }
  return product.price;
}

// Add these methods to existing salesController

exports.getSalesPageData = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, sortBy = 'priority', order = 'desc' } = req.query;
    const now = new Date();
    
    const query = {
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    };
    
    if (type && type !== 'all') query.type = type;

    // Get active sales with populated products
    const sales = await Sales.find(query)
      .populate({
        path: 'items.productId',
        select: 'title images brand averageRating numReviews categoryId'
      })
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Flatten products from all sales for easier display
    let products = [];
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.productId) {
          products.push({
            ...item.productId.toObject(),
            saleInfo: {
              saleId: sale._id,
              saleTitle: sale.title,
              saleType: sale.type,
              originalPrice: item.originalPrice,
              salePrice: item.salePrice,
              discountValue: item.discountValue,
              discountType: item.discountType,
              endDate: sale.endDate,
              badgeText: sale.displaySettings.badgeText,
              badgeColor: sale.displaySettings.badgeColor,
              soldCount: item.soldCount,
              stockLimit: item.stockLimit,
              variantId: item.variantId,
              optionType: item.optionType,
              optionValue: item.optionValue
            }
          });
        }
      });
    });

    // Remove duplicates if same product appears in multiple sales
    const uniqueProducts = products.reduce((acc, current) => {
      const existing = acc.find(item => 
        item._id.toString() === current._id.toString() &&
        item.saleInfo.variantId === current.saleInfo.variantId &&
        item.saleInfo.optionValue === current.saleInfo.optionValue
      );
      
      if (!existing) {
        acc.push(current);
      } else if (current.saleInfo.discountValue > existing.saleInfo.discountValue) {
        // Keep the better deal if product appears in multiple sales
        const index = acc.indexOf(existing);
        acc[index] = current;
      }
      
      return acc;
    }, []);

    const total = uniqueProducts.length;

    // Get sales summary for filters
    const salesSummary = await Sales.aggregate([
      {
        $match: {
          status: 'active',
          startDate: { $lte: now },
          endDate: { $gte: now }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        products: uniqueProducts,
        salesSummary,
        activeSales: sales.map(sale => ({
          _id: sale._id,
          title: sale.title,
          type: sale.type,
          endDate: sale.endDate,
          itemCount: sale.items.length
        }))
      },
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getActiveSalesByType = async (req, res) => {
  try {
    const { type } = req.params;
    const now = new Date();
    
    const sales = await Sales.find({
      status: 'active',
      type: type,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
    .populate({
      path: 'items.productId',
      select: 'title images brand averageRating numReviews'
    })
    .sort({ priority: -1 });

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = exports;