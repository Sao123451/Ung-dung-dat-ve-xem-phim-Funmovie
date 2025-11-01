// models/Room.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoomSchema = new Schema({
  cinema: { type: Schema.Types.ObjectId, ref: 'Cinema', required: true },
  name:   { type: String, required: true, trim: true },
  type:   { type: String, enum: ['2D','3D','IMAX'], default: '2D' },

  layout_key: { type: String, default: 'STD_10x10_2D' },
  rows:       { type: Number, default: 10 },
  cols:       { type: Number, default: 10 },

  capacity:   { type: Number, default: 0 },

  // Khóa chỉnh ghế thủ công (chỉ tái sinh theo preset)
  enforce_layout: { type: Boolean, default: true }
}, { timestamps: true });

RoomSchema.index({ cinema: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Room', RoomSchema);
