// models/Voucher.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VoucherSchema = new Schema({
  code: { type: String, required: true, unique: true },
  discount_percent: { type: Number, default: 0 },
  max_discount: { type: Number, default: 0 },
  start_date: Date,
  end_date: Date,
  usage_limit: { type: Number, default: 0 },
  used_count: { type: Number, default: 0 },
  status: { type: String, enum: ['active','expired','disabled'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Voucher', VoucherSchema);
