// models/Ticket.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSchema = new Schema({
  user:      { type: Schema.Types.ObjectId, ref: 'User' },
  showtime:  { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
  cinema:    { type: Schema.Types.ObjectId, ref: 'Cinema' },
  room:      { type: Schema.Types.ObjectId, ref: 'Room' },

  status: { type: String, enum: ['pending','paid','cancelled'], default: 'pending' },

  // 💡 Cho phép testpay/unknown để thử nghiệm
  payment_method: { 
    type: String, 
    enum: ['momo','zalopay','vnpay','cash','testpay','unknown'], 
    default: 'unknown' 
  },
  payment_status: { type: String, enum: ['unpaid','paid','refunded','failed'], default: 'unpaid' },
  payment_id:     { type: String, default: null },

  seat_subtotal:  { type: Number, default: 0 },
  combo_subtotal: { type: Number, default: 0 },
  discount_seat:  { type: Number, default: 0 },
  discount_combo: { type: Number, default: 0 },
  discount_order: { type: Number, default: 0 },
  total_before:   { type: Number, default: 0 },
  total_after:    { type: Number, default: 0 },
  voucher_codes:  [{ type: String }],

  expires_at:     { type: Date, default: null },

}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);
