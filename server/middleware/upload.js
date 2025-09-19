const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const ApiError = require('../utils/apiError');

// Configure Cloudinary storage
const getStorage = (folder) => new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => ({
    folder: `raees_mobiles/${folder}`,
    resource_type: file.fieldname.includes('Videos') ? 'video' : 'image',
    allowed_formats: file.fieldname.includes('Videos')
      ? ['mp4', 'webm', 'mov'] 
      : ['jpg', 'jpeg', 'png', 'webp', 'avif', 'jfif'],
    public_id: `${file.fieldname}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${file.originalname.split('.')[0]}`
  })
});

// File filter for images
const fileFilter = (req, file, cb) => {
  console.log('File filter - Fieldname:', file.fieldname, 'MIME:', file.mimetype);
  const filetypes = /jpeg|jpg|png|webp|avif|jfif/;
  const mimetype = filetypes.test(file.mimetype.toLowerCase());
  const extname = filetypes.test(file.originalname.split('.').pop().toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new ApiError(400, `Only JPEG, JPG, PNG, WebP and AVIF images are allowed (Field: ${file.fieldname}, MIME: ${file.mimetype})`));
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
  }
  cb(new ApiError(400, `Only MP4, WebM, and MOV videos are allowed (Field: ${file.fieldname}, MIME: ${file.mimetype})`));
};

// Helper functions
const isVideoField = (fieldname) => fieldname.includes('Videos') || fieldname.includes('videos');
const isImageField = (fieldname) => fieldname.includes('image') || fieldname.includes('Images');

const validateVariantField = (fieldname) => {
  const variantRegex = /^(variantImages|variantVideos)\[(\d+)\]$/;
  const match = fieldname.match(variantRegex);
  
  if (match) {
    const index = parseInt(match[2], 10);
    if (isNaN(index) || index < 0 || index > 5) {
      throw new ApiError(400, `Invalid variant index in field: ${fieldname}. Maximum 6 variants allowed (0-5)`);
    }
    return true;
  }
  return false;
};

// Multer configurations
const upload = {
  single: (fieldName, folder = 'misc') => multer({
    storage: getStorage(folder),
    fileFilter: fileFilter,
    limits: { fileSize: 30 * 1024 * 1024 }
  }).single(fieldName),

  singleVideo: (fieldName, folder = 'videos') => multer({
    storage: getStorage(folder),
    fileFilter: videoFileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }
  }).single(fieldName),

  array: (fieldName, maxCount, folder = 'products') => multer({
    storage: getStorage(folder),
    fileFilter: fileFilter,
    limits: { fileSize: 30 * 1024 * 1024 }
  }).array(fieldName, maxCount),

  arrayVideos: (fieldName, maxCount, folder = 'videos') => multer({
    storage: getStorage(folder),
    fileFilter: videoFileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }
  }).array(fieldName, maxCount),

  fields: (fields, folder = 'products') => {
    // Generate fields for up to 6 variants
    const variantFields = [];
    for (let i = 0; i < 6; i++) {
      variantFields.push(
        { name: `variantImages[${i}]`, maxCount: i < 2 ? 15 : (i < 4 ? 10 : 5) },
        { name: `variantVideos[${i}]`, maxCount: 3 }
      );
    }

    return multer({
      storage: getStorage(folder),
      fileFilter: (req, file, cb) => {
        try {
          if (isVideoField(file.fieldname)) {
            if (file.fieldname.startsWith('variantVideos[')) validateVariantField(file.fieldname);
            videoFileFilter(req, file, cb);
          } else if (isImageField(file.fieldname)) {
            if (file.fieldname.startsWith('variantImages[')) validateVariantField(file.fieldname);
            fileFilter(req, file, cb);
          } else {
            cb(new ApiError(400, `Invalid field: ${file.fieldname}`));
          }
        } catch (error) {
          cb(error);
        }
      },
      limits: {
        fileSize: 100 * 1024 * 1024,
        fields: 100,
        files: 100 
      }
    }).fields([...fields, ...variantFields]);
  }
};

module.exports = upload;