// models/Cinema.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CinemaSchema = new Schema({
  name:    { type: String, required: true },
  address: String,
  city:    String,
  hotline: String,

  // ✅ Thêm toạ độ
  latitude:  { type: Number },  // vĩ độ
  longitude: { type: Number }   // kinh độ
}, { timestamps: true });

module.exports = mongoose.model('Cinema', CinemaSchema);
