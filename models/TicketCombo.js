// models/TicketCombo.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const TicketComboSchema = new Schema({
  ticket:     { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
  product:    { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name:       { type: String, required: true },
  type:       { type: String, enum: ['popcorn','drink','combo'], required: true },
  qty:        { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true, min: 0 },
  line_total: { type: Number, required: true, min: 0 }
}, { timestamps: true });

TicketComboSchema.index({ ticket: 1 });

module.exports = mongoose.model('TicketCombo', TicketComboSchema);
