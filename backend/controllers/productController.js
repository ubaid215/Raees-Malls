const Product = require('../models/Product');

const createProduct = async (req, res) => {
  try {
    const { title, price, stock, description, isFeatured, variants, seo, categories } = req.body;
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    if (!title || !price) {
      return res.status(400).json({ success: false, error: 'Title and price are required' });
    }

    const seoData = seo ? JSON.parse(seo) : {};
    if (!seoData.slug || !seoData.title) {
      return res.status(400).json({
        success: false,
        error: 'SEO slug and title are required',
      });
    }

    const productData = {
      title,
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      description: description || '',
      isFeatured: isFeatured === 'true',
      variants: variants ? JSON.parse(variants) : [],
      seo: seoData,
      categories: categories ? JSON.parse(categories) : [],
      images,
    };

    const product = await Product.create(productData);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('Create product error:', error); // Log for debugging
    res.status(400).json({ success: false, error: error.message });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', isFeatured } = req.query;
    const query = {};
    
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (isFeatured === 'true') { 
      query.isFeatured = true;
    }

    const products = await Product.find(query)
      .populate('categories', 'name slug')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('categories', 'name slug');
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, price, stock, description, isFeatured, variants, seo, categories } = req.body;
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : undefined;

    const updateData = {
      ...(title && { title }),
      ...(price && { price: parseFloat(price) }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(description !== undefined && { description }),
      ...(isFeatured !== undefined && { isFeatured: isFeatured === 'true' }),
      ...(variants && { variants: JSON.parse(variants) }),
      ...(seo && { seo: JSON.parse(seo) }),
      ...(categories && { categories: JSON.parse(categories) }),
      ...(images && { images }),
    };

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};


const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    res.status(200).json({
      success: true,
      data: { id: req.params.id }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct
};