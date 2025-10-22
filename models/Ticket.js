// models/Ticket.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  showtime: { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
  seats: [{ seat: { type: Schema.Types.ObjectId, ref: 'Seat' }, label: String }],
  booking_time: { type: Date, default: Date.now },
  qr_code: String,
  status: { type: String, enum: ['booked','cancelled','used'], default: 'booked' },
  voucher: { type: Schema.Types.ObjectId, ref: 'Voucher', default: null },
  total_amount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);
