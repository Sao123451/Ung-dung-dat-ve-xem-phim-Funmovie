// models/Room.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoomSchema = new Schema({
  cinema: { type: Schema.Types.ObjectId, ref: 'Cinema', required: true },
  name:   { type: String, required: true },
  type:   { type: String, enum: ['2D','3D','IMAX'], default: '2D' },

  // Layout/preset để sinh ghế
  layout_key: { type: String, default: 'STD_12x10_2D' }, // định danh preset
  cols:       { type: Number, default: 12 },             // số cột để render lưới

  // Sức chứa (tự tính = số ghế đã sinh)
  capacity:   { type: Number, default: 0 }
}, { timestamps: true });

RoomSchema.index({ cinema: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Room', RoomSchema);
