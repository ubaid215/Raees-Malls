const HeroImage = require('../models/HeroImage');

/**
 * Create a new hero image
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createHeroImage = async (req, res) => {
  try {
    const { title, caption, link, order } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image file is required',
      });
    }

    const heroImage = await HeroImage.create({
      imageUrl,
      title,
      caption,
      link,
      order: order ? parseInt(order) : 0,
    });

    res.status(201).json({
      success: true,
      data: heroImage,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get all hero images, sorted by order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllHeroImages = async (req, res) => {
  try {
    const heroImages = await HeroImage.find().sort({ order: 1 }); // Ascending order

    res.status(200).json({
      success: true,
      data: heroImages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Update a hero image by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateHeroImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, caption, link, order } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updateData = {
      ...(title !== undefined && { title }),
      ...(caption !== undefined && { caption }),
      ...(link !== undefined && { link }),
      ...(order !== undefined && { order: parseInt(order) }),
      ...(imageUrl && { imageUrl }),
    };

    const heroImage = await HeroImage.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!heroImage) {
      return res.status(404).json({
        success: false,
        error: 'Hero image not found',
      });
    }

    res.status(200).json({
      success: true,
      data: heroImage,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Delete a hero image by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteHeroImage = async (req, res) => {
  try {
    const { id } = req.params;

    const heroImage = await HeroImage.findByIdAndDelete(id);

    if (!heroImage) {
      return res.status(404).json({
        success: false,
        error: 'Hero image not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { id },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  createHeroImage,
  getAllHeroImages,
  updateHeroImage,
  deleteHeroImage,
};