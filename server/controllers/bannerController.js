const Banner = require('../models/Banner');
const cloudinary = require('../config/cloudinary');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// Upload a new banner
exports.uploadBanner = async (req, res, next) => {
  try {
    const { title, description, targetUrl, priority, isActive, position } = req.body;

    if (!req.file) {
      throw new ApiError(400, 'Banner image is required');
    }

    console.log('Multer file metadata:', req.file); // Debugging log

    const banner = new Banner({
      title,
      description,
      targetUrl,
      priority: priority ? parseInt(priority) : 0,
      isActive: isActive !== undefined ? isActive : true,
      position,
      image: {
        url: req.file.path, // Cloudinary URL provided by multer-storage-cloudinary
        public_id: req.file.filename, // Public ID provided by multer-storage-cloudinary
        alt: title
      }
    });

    await banner.save();

    ApiResponse.success(res, 201, 'Banner uploaded successfully', { banner });
  } catch (error) {
    next(error);
  }
};

// Update an existing banner
exports.updateBanner = async (req, res, next) => {
  try {
    const { bannerId } = req.params;
    const { title, description, targetUrl, priority, isActive, position } = req.body;

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }

    // Update fields
    banner.title = title || banner.title;
    banner.description = description || banner.description;
    banner.targetUrl = targetUrl || banner.targetUrl;
    banner.priority = priority ? parseInt(priority) : banner.priority;
    banner.isActive = isActive !== undefined ? isActive : banner.isActive;
    banner.position = position || banner.position;

    // Update image if provided
    if (req.file) {
      console.log('Updating file metadata:', req.file); // Debugging log

      // Delete old image from Cloudinary
      await cloudinary.uploader.destroy(banner.image.public_id);

      // Use the new image data from multer-storage-cloudinary
      banner.image = {
        url: req.file.path,
        public_id: req.file.filename,
        alt: title || banner.title
      };
    }

    await banner.save();

    ApiResponse.success(res, 200, 'Banner updated successfully', { banner });
  } catch (error) {
    next(error);
  }
};

// Delete a banner
exports.deleteBanner = async (req, res, next) => {
  try {
    const { bannerId } = req.params;

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }

    // Delete image from Cloudinary
    await cloudinary.uploader.destroy(banner.image.public_id);

    // Delete banner from database
    await banner.deleteOne();

    ApiResponse.success(res, 200, 'Banner deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Get all banners (admin)
exports.getAllBanners = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const banners = await Banner.find()
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Banner.countDocuments();

    ApiResponse.success(res, 200, 'Banners retrieved successfully', {
      banners,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

// Get active banners (public)
exports.getActiveBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find({ isActive: true })
      .sort({ priority: -1, createdAt: -1 });

    ApiResponse.success(res, 200, 'Active banners retrieved successfully', { banners });
  } catch (error) {
    next(error);
  }
};