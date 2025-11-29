const mongoose = require('mongoose');
const { Schema } = mongoose;

const VoucherSchema = new Schema({
  code:          { type: String, required: true, unique: true, uppercase: true, trim: true },

  scope:         { type: String, enum: ['seat','combo','order'], required: true },

  discount_type: { type: String, enum: ['percent','amount'], required: true },

  value:         { type: Number, required: true, min: 0 },
  max_discount:  { type: Number, default: null },
  min_order:     { type: Number, default: 0 },

  start_date:    { type: Date, default: null },
  end_date:      { type: Date, default: null },

  usage_limit:   { type: Number, default: 0 }, // 0 = unlimited
  used_count:    { type: Number, default: 0 },

  active:        { type: Boolean, default: true },

  distribute_type: {
    type: String,
    enum: ['auto', 'manual'], // auto: phát cho toàn bộ user
    default: 'manual'
  }

}, { timestamps: true });

VoucherSchema.index({ code: 1 });

module.exports = mongoose.model('Voucher', VoucherSchema);
