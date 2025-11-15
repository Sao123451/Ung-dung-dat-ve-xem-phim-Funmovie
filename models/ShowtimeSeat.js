// models/ShowtimeSeat.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ShowtimeSeatSchema = new Schema({
  showtime: { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },

  seat: { type: Schema.Types.ObjectId, ref: 'Seat', required: true },

  row: { type: String, required: true },
  number: { type: Number, required: true },
  seat_type: { type: String, enum: ['normal', 'vip', 'couple'], default: 'normal' },
  extra_price: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['available', 'holding', 'sold', 'broken'],
    default: 'available'
  },

}, { timestamps: true });

ShowtimeSeatSchema.index({ showtime: 1, seat: 1 }, { unique: true });

module.exports = mongoose.model('ShowtimeSeat', ShowtimeSeatSchema);
