const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const ApiError = require('../utils/apiError');

// Configure Cloudinary storage for multer (images)
const getStorage = (folder) => new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: `raees_mobiles/${folder}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => `${file.fieldname}-${Date.now()}`
  }
});

// Configure Cloudinary storage for multer (videos)
const getVideoStorage = (folder) => new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: `raees_mobiles/${folder}`,
    resource_type: 'video',
    allowed_formats: ['mp4', 'webm', 'mov'],
    public_id: (req, file) => `${file.fieldname}-${Date.now()}`
  }
});

// File filter to allow images (including WebP)
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp/;
  const extname = filetypes.test(file.mimetype.toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPEG, JPG, PNG, and WebP images are allowed'));
  }
};

// File filter to allow videos
const videoFileFilter = (req, file, cb) => {
  const filetypes = /mp4|webm|mov/;
  const extname = filetypes.test(file.mimetype.toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new ApiError(400, 'Only MP4, WebM, and MOV videos are allowed'));
  }
};

// Multer configurations for different use cases
const upload = {
  // For single image uploads (e.g., banners)
  single: (fieldName, folder = 'misc') => multer({
    storage: getStorage(folder),
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  }).single(fieldName),

  // For single video uploads
  singleVideo: (fieldName, folder = 'videos') => multer({
    storage: getVideoStorage(folder),
    fileFilter: videoFileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  }).single(fieldName),

  // For multiple image uploads (e.g., products with baseImages)
  array: (fieldName, maxCount, folder = 'products') => multer({
    storage: getStorage(folder),
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
  }).array(fieldName, maxCount),

  // For multiple video uploads (e.g., products with baseVideos)
  arrayVideos: (fieldName, maxCount, folder = 'videos') => multer({
    storage: getVideoStorage(folder),
    fileFilter: videoFileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
  }).array(fieldName, maxCount),

  // For multiple fields (e.g., products with baseImages, variantImages, baseVideos, variantVideos)
  fields: (fields, folder = 'products') => multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (file.fieldname.includes('Images')) {
        fileFilter(req, file, cb);
      } else if (file.fieldname.includes('Videos')) {
        videoFileFilter(req, file, cb);
      } else {
        cb(new ApiError(400, 'Invalid field name'));
      }
    },
    limits: {
      fileSize: (req, file) => {
        if (file.fieldname.includes('Videos')) {
          return 50 * 1024 * 1024; // 50MB for videos
        }
        return 5 * 1024 * 1024; // 5MB for images
      }
    }
  }).fields(fields)
};

module.exports = upload;