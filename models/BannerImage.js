// models/BannerImage.js
const mongoose = require('mongoose');

const bannerImageSchema = new mongoose.Schema({
  banner_id: { type: mongoose.Types.ObjectId, ref: 'Banner', required: true },
  image_url: { type: String, required: true, trim: true }, // "/public/uploads/xxx.jpg"
  movie_id:  { type: mongoose.Types.ObjectId, ref: 'Movie', default: null } // << thêm field
}, { timestamps: true });

bannerImageSchema.index({ banner_id: 1, createdAt: -1 });
module.exports = mongoose.model('BannerImage', bannerImageSchema);
