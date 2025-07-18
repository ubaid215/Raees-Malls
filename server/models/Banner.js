const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bannerSchema = new Schema({
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    url: { type: String },
    public_id: { type: String },
    alt: { type: String }
  },
 videos: [{
    url: { type: String },
    public_id: { type: String }
  }],
  targetUrl: {
    type: String,
    trim: true
  },
  priority: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  position: {
    type: String,
    enum: ['hero-slider'],
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

bannerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Banner', bannerSchema);