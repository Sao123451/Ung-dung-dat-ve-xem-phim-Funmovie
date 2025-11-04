// models/Product.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProductSchema = new Schema({
  name:        { type: String, required: true, trim: true },
  type:        { type: String, enum: ['popcorn','drink','combo'], required: true },
  price:       { type: Number, required: true, min: 0 },
  image:       { type: String, default: '' },
  description: { type: String, default: '' },
  active:      { type: Boolean, default: true }
}, { timestamps: true });

ProductSchema.index({ name: 1, type: 1 });

module.exports = mongoose.model('Product', ProductSchema);
