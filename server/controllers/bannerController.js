const Banner = require('../models/Banner');
const cloudinary = require('../config/cloudinary');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// Upload a new banner
exports.uploadBanner = async (req, res, next) => {
  try {
    const { title, description, targetUrl, priority, isActive, position } = req.body;

    if (!req.files?.image && !req.files?.videos) {
      throw new ApiError(400, 'At least one banner image or video is required');
    }

    const bannerData = {
      title,
      description,
      targetUrl,
      priority: priority ? parseInt(priority) : 0,
      isActive: isActive !== undefined ? isActive : true,
      position
    };

    // Handle image upload if exists
    if (req.files?.image?.[0]) {
      bannerData.image = {
        url: req.files.image[0].path,
        public_id: req.files.image[0].filename,
        alt: title || 'Banner image'
      };
    }

    // Handle video uploads if exist
    if (req.files?.videos) {
      bannerData.videos = req.files.videos.map(file => ({
        url: file.path,
        public_id: file.filename
      }));
    }

    const banner = new Banner(bannerData);
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

    banner.title = title || banner.title;
    banner.description = description || banner.description;
    banner.targetUrl = targetUrl || banner.targetUrl;
    banner.priority = priority ? parseInt(priority) : banner.priority;
    banner.isActive = isActive !== undefined ? isActive : banner.isActive;
    banner.position = position || banner.position;

    if (req.files?.image?.[0]) {
      console.log('Updating image metadata:', req.files.image[0]);
      if (banner.image?.public_id) {
        await cloudinary.uploader.destroy(banner.image.public_id);
      }
      banner.image = {
        url: req.files.image[0].path,
        public_id: req.files.image[0].filename,
        alt: title || banner.title
      };
    }

    if (req.files?.videos) {
      console.log('Updating videos metadata:', req.files.videos);
      // Delete existing videos from Cloudinary
      if (banner.videos?.length > 0) {
        for (const video of banner.videos) {
          await cloudinary.uploader.destroy(video.public_id, { resource_type: 'video' });
        }
      }
      // Add new videos
      banner.videos = req.files.videos.map(file => ({
        url: file.path,
        public_id: file.filename
      }));
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
    if (banner.image?.public_id) {
      await cloudinary.uploader.destroy(banner.image.public_id);
    }

    // Delete videos from Cloudinary
    if (banner.videos?.length > 0) {
      for (const video of banner.videos) {
        await cloudinary.uploader.destroy(video.public_id, { resource_type: 'video' });
      }
    }

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