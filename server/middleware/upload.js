// middleware/upload.js
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const ApiError = require('../utils/apiError');

// Configure Cloudinary storage for both images and videos
const getStorage = (folder) => new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => ({
    folder: `raees_mobiles/${folder}`,
    resource_type: file.fieldname.includes('Videos') || file.fieldname.includes('videos') ? 'video' : 'image',
    allowed_formats: file.fieldname.includes('Videos') || file.fieldname.includes('videos')
      ? ['mp4', 'webm', 'mov'] 
      : ['jpg', 'jpeg', 'png', 'webp'],
    public_id: `${file.fieldname}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${file.originalname.split('.')[0]}`
  })
});

// File filter for images
const fileFilter = (req, file, cb) => {
  console.log('File filter - Fieldname:', file.fieldname, 'MIME:', file.mimetype);
  const filetypes = /jpeg|jpg|png|webp/;
  const mimetype = filetypes.test(file.mimetype.toLowerCase());
  const extname = filetypes.test(file.originalname.split('.').pop().toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new ApiError(400, `Only JPEG, JPG, PNG, and WebP images are allowed (Field: ${file.fieldname}, MIME: ${file.mimetype})`));
  }
};

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  console.log('Video file filter - Fieldname:', file.fieldname, 'MIME:', file.mimetype);
  const allowedMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  const allowedExts = /mp4|webm|mov/;
  const mimetype = allowedMimeTypes.includes(file.mimetype.toLowerCase());
  const extname = allowedExts.test(file.originalname.split('.').pop().toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new ApiError(400, `Only MP4, WebM, and MOV videos are allowed (Field: ${file.fieldname}, MIME: ${file.mimetype})`));
  }
};

// Helper function to determine if field is for video uploads
const isVideoField = (fieldname) => {
  const videoFields = ['videos', 'baseVideos', 'variantVideos'];
  return videoFields.some(field => 
    fieldname === field || 
    fieldname.startsWith(`${field}[`) || 
    fieldname.includes('videos') || 
    fieldname.includes('Videos')
  );
};

// Helper function to determine if field is for image uploads
const isImageField = (fieldname) => {
  const imageFields = ['image', 'images', 'baseImages', 'variantImages', 'banners'];
  return imageFields.some(field => 
    fieldname === field || 
    fieldname.startsWith(`${field}[`) ||
    fieldname.includes('image') ||
    fieldname.includes('Images')
  );
};

// Helper function to validate variant field names
const validateVariantField = (fieldname) => {
  const variantRegex = /^(variantImages|variantVideos)\[\d+\]$/;
  if (variantRegex.test(fieldname)) {
    const index = parseInt(fieldname.match(/\[(\d+)\]/)[1], 10);
    if (isNaN(index) || index < 0) {
      throw new ApiError(400, `Invalid variant index in field: ${fieldname}`);
    }
    return true;
  }
  return false;
};

// Multer configurations for different use cases
const upload = {
  // For single image uploads (e.g., banners)
  single: (fieldName, folder = 'misc') => multer({
    storage: getStorage(folder),
    fileFilter: fileFilter,
    limits: { fileSize: 30 * 1024 * 1024 } // 30MB 
  }).single(fieldName),

  // For single video uploads
  singleVideo: (fieldName, folder = 'videos') => multer({
    storage: getStorage(folder),
    fileFilter: videoFileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
  }).single(fieldName),

  // For multiple image uploads (e.g., products with baseImages)
  array: (fieldName, maxCount, folder = 'products') => multer({
    storage: getStorage(folder),
    fileFilter: fileFilter,
    limits: { fileSize: 30 * 1024 * 1024 } 
  }).array(fieldName, maxCount),

  // For multiple video uploads (e.g., products with baseVideos)
  arrayVideos: (fieldName, maxCount, folder = 'videos') => multer({
    storage: getStorage(folder),
    fileFilter: videoFileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } 
  }).array(fieldName, maxCount),

  // For multiple fields (e.g., products with baseImages, baseVideos, variantImages, variantVideos, banners)
  fields: (fields, folder = 'products') => {
    // Dynamically generate fields for up to 3 variants (based on ProductForm.js max variants)
    const dynamicFields = [
      ...fields.filter(field => 
        !field.name.startsWith('variantImages[') && !field.name.startsWith('variantVideos[')
      ),
      // Add fields for variantImages[0] to variantImages[2]
      { name: 'variantImages[0]', maxCount: 15 },
      { name: 'variantImages[1]', maxCount: 15 },
      { name: 'variantImages[2]', maxCount: 5 },
      // Add fields for variantVideos[0] to variantVideos[2]
      { name: 'variantVideos[0]', maxCount: 3 },
      { name: 'variantVideos[1]', maxCount: 3 },
      { name: 'variantVideos[2]', maxCount: 3 },
    ];

    return multer({
      storage: getStorage(folder),
      fileFilter: (req, file, cb) => {
        console.log('Processing field:', file.fieldname);
        try {
          if (isVideoField(file.fieldname)) {
            if (file.fieldname.startsWith('variantVideos[')) {
              validateVariantField(file.fieldname);
            }
            videoFileFilter(req, file, cb);
          } else if (isImageField(file.fieldname)) {
            if (file.fieldname.startsWith('variantImages[')) {
              validateVariantField(file.fieldname);
            }
            fileFilter(req, file, cb);
          } else {
            cb(new ApiError(400, `Invalid field name: ${file.fieldname}. Allowed fields include: image, images, baseImages, variantImages[*], banners, videos, baseVideos, variantVideos[*]`));
          }
        } catch (error) {
          cb(error);
        }
      },
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
        fields: 50, // Allow more non-file fields for product data
        files: 36, // Max: 10 baseImages + 3 baseVideos + (15 variantImages[0] + 15 variantImages[1] + 5 variantImages[2]) + (3 variantVideos[0] + 3 variantVideos[1] + 3 variantVideos[2])
      }
    }).fields(dynamicFields);
  }
};

module.exports = upload;