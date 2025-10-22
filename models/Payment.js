// models/Payment.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentSchema = new Schema({
  ticket: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['card','wallet','cash','third_party'], default: 'card' },
  status: { type: String, enum: ['pending','success','failed'], default: 'pending' },
  transaction_id: String,
  payment_time: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
