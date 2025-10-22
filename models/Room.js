// models/Room.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoomSchema = new Schema({
  cinema: { type: Schema.Types.ObjectId, ref: 'Cinema', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['2D','3D','IMAX'], default: '2D' },
  capacity: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);
