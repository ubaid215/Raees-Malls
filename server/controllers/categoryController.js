const Category = require('../models/Category');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const cloudinary = require('../config/cloudinary');

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

    ApiResponse.success(res, 201, 'Category created successfully', { category });
  } catch (error) {
    next(new ApiError(500, error.message || 'Failed to create category'));
  }
};

exports.getAllCategories = async (req, res, next) => {
  try {
    const { page = 1, limit, sort, parentId } = req.query; // Removed default limit = 10

    const query = {};
    if (parentId) {
      query.parentId = parentId === 'null' ? null : parentId;
    }

    const sortOption = sort || 'name';
    const skip = (page - 1) * (limit || 0); // Handle undefined limit

    let categoryQuery = Category.find(query)
      .populate('parentId', 'name slug')
      .sort(sortOption)
      .skip(skip);

    // Only apply limit if specified
    if (limit) {
      categoryQuery = categoryQuery.limit(parseInt(limit));
    }

    const categories = await categoryQuery;
    const total = await Category.countDocuments(query);

    const response = {
      categories,
      total,
      page: parseInt(page),
    };

    // Only add pagination info if limit is specified
    if (limit) {
      response.limit = parseInt(limit);
      response.totalPages = Math.ceil(total / parseInt(limit));
    }

    ApiResponse.success(res, 200, 'Categories retrieved successfully', response);
  } catch (error) {
    next(error);
  }
};

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

exports.updateCategory = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const { name, slug, description, parentId, removeImage } = req.body;

    // Handle image operations
    if (req.file) {
      // New image uploaded - remove old image if exists and set new one
      if (category.imagePublicId) {
        await cloudinary.uploader.destroy(category.imagePublicId);
      }
      category.image = req.file.path;
      category.imagePublicId = req.file.filename;
    } else if (removeImage === 'true' || removeImage === true) {
      // Image removal requested - remove from cloudinary and clear from database
      if (category.imagePublicId) {
        await cloudinary.uploader.destroy(category.imagePublicId);
      }
      category.image = null;
      category.imagePublicId = null;
    }
    // If neither new image nor removal, keep existing image unchanged

    // Update other fields
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

    await AuditLog.create({
      userId,
      action: 'CATEGORY_UPDATE',
      details: `Category updated: ${category._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const io = req.app.get('socketio');
    const categoryData = {
      _id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      image: category.image, // This will be null if removed
    };

    io.to('adminRoom').emit('categoryUpdated', {
      category: categoryData,
    });
    io.to('publicRoom').emit('categoryUpdated', {
      category: categoryData,
    });

    ApiResponse.success(res, 200, 'Category updated successfully', {
      category,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const deletedCategoryIds = [];

    async function deleteProductsInCategory(categoryId) {
      const products = await Product.find({ categoryId });
      for (const product of products) {
        if (product.images?.length > 0) {
          for (const image of product.images) {
            if (image.public_id) {
              await cloudinary.uploader.destroy(image.public_id);
            }
          }
        }
        await product.deleteOne();
        await AuditLog.create({
          userId,
          action: 'PRODUCT_DELETE',
          details: `Product deleted due to category deletion: ${product._id}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
      const subcategories = await Category.find({ parentId: categoryId });
      for (const subcategory of subcategories) {
        await deleteProductsInCategory(subcategory._id);
      }
    }

    async function deleteCategoryAndSubcategories(categoryId) {
      await deleteProductsInCategory(categoryId);
      const subcategories = await Category.find({ parentId: categoryId });
      for (const subcategory of subcategories) {
        await deleteCategoryAndSubcategories(subcategory._id);
      }
      const cat = await Category.findById(categoryId);
      if (cat) {
        if (cat.imagePublicId) {
          await cloudinary.uploader.destroy(cat.imagePublicId);
        }
        await cat.deleteOne();
        deletedCategoryIds.push(categoryId.toString());
        await AuditLog.create({
          userId,
          action: 'CATEGORY_DELETE',
          details: `Category deleted: ${cat._id}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
    }

    await deleteCategoryAndSubcategories(category._id);

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

exports.getAllCategoriesForCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit, sort, parentId } = req.query; 

    const query = {};
    if (parentId) {
      query.parentId = parentId === 'null' ? null : parentId;
    }

    const sortOption = sort || 'name';
    const skip = (page - 1) * (limit || 0);

    let categoryQuery = Category.find(query)
      .select('-__v')
      .populate('parentId', 'name slug')
      .sort(sortOption)
      .skip(skip);

    // Only apply limit if specified
    if (limit) {
      categoryQuery = categoryQuery.limit(parseInt(limit));
    }

    const categories = await categoryQuery;
    const total = await Category.countDocuments(query);

    const response = {
      categories,
      total,
      page: parseInt(page),
    };

    // Only add pagination info if limit is specified
    if (limit) {
      response.limit = parseInt(limit);
      response.totalPages = Math.ceil(total / parseInt(limit));
    }

    ApiResponse.success(res, 200, 'Categories retrieved successfully', response);
  } catch (error) {
    next(error);
  }
};

exports.getCategoryByIdForCustomers = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .select('-__v')
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

exports.getCategoryProductsForCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort, minPrice, maxPrice, search } = req.query;
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const query = {
      categoryId: categoryId,
      stock: { $gt: 0 },
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

    const products = await Product.find(query)
      .select('-__v')
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