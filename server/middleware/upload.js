const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const ApiError = require('../utils/apiError');

// Configure Cloudinary storage for both images and videos
const getStorage = (folder) => new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => ({
    folder: `raees_mobiles/${folder}`,
    resource_type: file.fieldname.includes('Videos') ? 'video' : 'image',
    allowed_formats: file.fieldname.includes('Videos') 
      ? ['mp4', 'webm', 'mov'] 
      : ['jpg', 'jpeg', 'png', 'webp'],
    public_id: `${file.fieldname}-${Date.now()}`
  })
});

// File filter for images
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp/;
  const mimetype = filetypes.test(file.mimetype.toLowerCase());
  const extname = filetypes.test(file.originalname.split('.').pop().toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPEG, JPG, PNG, and WebP images are allowed'));
  }
};

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  const allowedExts = /mp4|webm|mov/;
  const mimetype = allowedMimeTypes.includes(file.mimetype.toLowerCase());
  const extname = allowedExts.test(file.originalname.split('.').pop().toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new ApiError(400, `Only MP4, WebM, and MOV videos are allowed (MIME: ${file.mimetype})`));
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
    storage: getStorage(folder),
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
    storage: getStorage(folder),
    fileFilter: videoFileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
  }).array(fieldName, maxCount),

  // For multiple fields (e.g., products with baseImages, baseVideos, variantImages, variantVideos)
  fields: (fields, folder = 'products') => multer({
    storage: getStorage(folder),
    fileFilter: (req, file, cb) => {
      if (file.fieldname.includes('Images')) {
        fileFilter(req, file, cb);
      } else if (file.fieldname.includes('Videos')) {
        videoFileFilter(req, file, cb);
      } else {
        cb(new ApiError(400, `Invalid field name: ${file.fieldname}`));
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB limit to support videos
    }
  }).fields(fields)
};

module.exports = upload;