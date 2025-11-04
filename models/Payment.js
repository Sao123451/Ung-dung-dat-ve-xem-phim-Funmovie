const mongoose = require('mongoose');
const { Schema } = mongoose;

const PaymentSchema = new Schema({
  ticket:   { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
  user:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  method:   { type: String, enum: ['cash','momo','zalopay','vnpay','card','unknown'], default: 'unknown' },
  amount:   { type: Number, required: true, min: 0 },

  status:   { type: String, enum: ['pending','succeeded','failed','refunded'], default: 'pending', index: true },
  provider_txn_id:   { type: String, default: '' },
  provider_message:  { type: String, default: '' },
  meta:     { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
