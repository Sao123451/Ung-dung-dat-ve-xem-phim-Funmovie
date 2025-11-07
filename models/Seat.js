// models/Seat.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const SeatSchema = new Schema({
  room:        { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  row:         { type: String, required: true },
  number:      { type: Number, required: true },
  seat_type:   { type: String, enum: ['normal', 'vip', 'couple'], default: 'normal' },
  extra_price: { type: Number, default: 0 },

  // thêm trạng thái holding + fix lỗi khoảng trắng ở ' sold'
  seat_status: {
    type: String,
    enum: ['available', 'holding', 'sold', 'broken'],
    default: 'available'
  }

}, { timestamps: true });

SeatSchema.index({ room:1, row:1, number:1 }, { unique: true });

module.exports = mongoose.models.Seat || mongoose.model('Seat', SeatSchema);
