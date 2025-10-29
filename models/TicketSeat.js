const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSeatSchema = new Schema({
  ticket: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
  seat:   { type: Schema.Types.ObjectId, ref: 'Seat', required: true },
  label:  { type: String, default: '' },
  price:  { type: Number, default: 0 },
  status: { type: String, enum: ['booked','cancelled','used'], default: 'booked' }
}, { timestamps: true });

TicketSeatSchema.index({ ticket: 1, seat: 1 }, { unique: true });

module.exports = mongoose.model('TicketSeat', TicketSeatSchema);
