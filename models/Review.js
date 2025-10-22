// models/Review.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  rating: { type: Number, min: 0, max: 5, required: true },
  comment: String,
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', ReviewSchema);
