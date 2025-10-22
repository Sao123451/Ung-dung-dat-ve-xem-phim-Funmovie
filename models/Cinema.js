// models/Cinema.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CinemaSchema = new Schema({
  name: { type: String, required: true },
  address: String,
  city: String,
  hotline: String
}, { timestamps: true });

module.exports = mongoose.model('Cinema', CinemaSchema);
