// models/Movie.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovieSchema = new Schema({
  title:        { type: String, required: true },
  description:  String,
  duration:     Number,
  director:     String,
  cast:         [String],
  genre:        [String],
  release_date: Date,
  language:     String,
  poster:       String,
  rating:       Number,

  // ⭐ GIỚI HẠN ĐỘ TUỔI
  // 0 = phổ biến, 13 = T13, 16 = T16, 18 = T18
  age_limit:    { type: Number, default: 0 },

  status:       { type: String, enum: ['coming','now_showing','archived'], default: 'coming' },
  created_at:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Movie', MovieSchema);
