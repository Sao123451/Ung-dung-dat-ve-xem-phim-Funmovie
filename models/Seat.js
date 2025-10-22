// models/Seat.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SeatSchema = new Schema({
  room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  row: String,
  number: Number,
  seat_type: { type: String, enum: ['normal','vip','couple'], default: 'normal' },
  extra_price: { type: Number, default: 0 }
}, { timestamps: true });

SeatSchema.index({ room: 1, row: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Seat', SeatSchema);
