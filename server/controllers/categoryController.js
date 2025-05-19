const Category = require('../models/Category');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const cloudinary = require('../config/cloudinary');

// Create a new category (Admin only)
exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, parentId } = req.body;
    const image = req.file ? req.file.path : null;

    const category = new Category({
      name,
      slug,
      description,
      parentId: parentId === 'null' ? null : parentId,
      image,
    });
    await category.save();

    // Emit Socket.IO event for category creation
    const io = req.app.get('socketio');
    io.to('adminRoom').emit('categoryCreated', {
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        image: category.image,
      },
    });
    io.to('publicRoom').emit('categoryCreated', {
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        image: category.image,
      },
    });

    res.status(201).json({ message: 'Category created', category });
  } catch (err) {
    next(new ApiError(500, err.message || 'Failed to create category'));
  }
};

// Get all categories for admin with pagination, sorting, and filtering (Admin only)
exports.getAllCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, parentId } = req.query;

    const query = {};
    if (parentId) {
      query.parentId = parentId === 'null' ? null : parentId;
    }

    const sortOption = sort || 'name';
    const skip = (page - 1) * limit;

    const categories = await Category.find(query)
      .populate('parentId', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Category.countDocuments(query);

    ApiResponse.success(res, 200, 'Categories retrieved successfully', {
      categories,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// Get a single category by ID (Admin only)
exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).populate(
      'parentId',
      'name slug'
    );

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    ApiResponse.success(res, 200, 'Category retrieved successfully', {
      category,
    });
  } catch (error) {
    next(error);
  }
};

// Update a category (Admin only)
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const { name, slug, description, parentId } = req.body;

    // Handle image update
    if (req.file) {
      // Delete old image if exists
      if (category.imagePublicId) {
        await cloudinary.uploader.destroy(category.imagePublicId);
      }

      // Upload new image
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'categories',
      });
      category.image = result.secure_url;
      category.imagePublicId = result.public_id;
    }

    category.name = name || category.name;
    category.slug = slug || category.slug;
    category.description = description || category.description;
    category.parentId =
      parentId !== undefined
        ? parentId === 'null'
          ? null
          : parentId
        : category.parentId;

    await category.save();

    // Log the action
    await AuditLog.create({
      userId: req.user._id,
      action: 'CATEGORY_UPDATE',
      details: `Category updated: ${category._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit Socket.IO event for category update
    const io = req.app.get('socketio');
    io.to('adminRoom').emit('categoryUpdated', {
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        image: category.image,
      },
    });
    io.to('publicRoom').emit('categoryUpdated', {
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        image: category.image,
      },
    });

    ApiResponse.success(res, 200, 'Category updated successfully', {
      category,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a category (Admin only)
 
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // Track deleted category IDs for Socket.IO event
    const deletedCategoryIds = [];

    // Recursively delete products in category and subcategories
    async function deleteProductsInCategory(categoryId) {
      // Delete products in the current category
      const products = await Product.find({ categoryId });
      for (const product of products) {
        // Delete product images from Cloudinary if they exist
        if (product.images && product.images.length > 0) {
          for (const image of product.images) {
            if (image.public_id) {
              await cloudinary.uploader.destroy(image.public_id);
            }
          }
        }

        await product.deleteOne();

        // Log product deletion
        await AuditLog.create({
          userId: req.user._id,
          action: 'PRODUCT_DELETE',
          details: `Product deleted due to category deletion: ${product._id}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }

      // Recursively delete products in subcategories
      const subcategories = await Category.find({ parentId: categoryId });
      for (const subcategory of subcategories) {
        await deleteProductsInCategory(subcategory._id);
      }
    }

    // Recursively delete category and subcategories
    async function deleteCategoryAndSubcategories(categoryId) {
      // Delete products first
      await deleteProductsInCategory(categoryId);

      // Delete subcategories
      const subcategories = await Category.find({ parentId: categoryId });
      for (const subcategory of subcategories) {
        await deleteCategoryAndSubcategories(subcategory._id);
      }

      const cat = await Category.findById(categoryId);
      if (cat) {
        // Delete category image from Cloudinary if exists
        if (cat.imagePublicId) {
          await cloudinary.uploader.destroy(cat.imagePublicId);
        }

        await cat.deleteOne();
        deletedCategoryIds.push(categoryId.toString());

        // Log category deletion
        await AuditLog.create({
          userId: req.user._id,
          action: 'CATEGORY_DELETE',
          details: `Category deleted: ${cat._id}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
    }

    await deleteCategoryAndSubcategories(category._id);

    // Emit Socket.IO event for category deletion
    const io = req.app.get('socketio');
    io.to('adminRoom').emit('categoryDeleted', {
      categoryIds: deletedCategoryIds,
    });
    io.to('publicRoom').emit('categoryDeleted', {
      categoryIds: deletedCategoryIds,
    });

    ApiResponse.success(
      res,
      200,
      'Category, its subcategories, and associated products deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get all categories for customers (Public)
exports.getAllCategoriesForCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, parentId } = req.query;

    const query = {};
    if (parentId) {
      query.parentId = parentId === 'null' ? null : parentId;
    }

    const sortOption = sort || 'name';
    const skip = (page - 1) * limit;

    const categories = await Category.find(query)
      .select('-__v') // Exclude version field
      .populate('parentId', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Category.countDocuments(query);

    ApiResponse.success(res, 200, 'Categories retrieved successfully', {
      categories,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// Get a single category by ID for customers (Public)
exports.getCategoryByIdForCustomers = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .select('-__v') // Exclude version field
      .populate('parentId', 'name slug');

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    ApiResponse.success(res, 200, 'Category retrieved successfully', {
      category,
    });
  } catch (error) {
    next(error);
  }
};

// Get products in a specific category for customers (Public)
exports.getCategoryProductsForCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, minPrice, maxPrice, search } =
      req.query;
    const categoryId = req.params.id;

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // Build query for products
    const query = {
      categoryId: categoryId,
      stock: { $gt: 0 }, // Only show products in stock
    };

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption = sort || '-createdAt';
    const skip = (page - 1) * limit;

    // Fetch products in the category
    const products = await Product.find(query)
      .select('-__v') // Exclude version field
      .populate('categoryId', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    ApiResponse.success(res, 200, 'Category products retrieved successfully', {
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
      },
      products,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};