const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HoldSchema = new Schema({
  showtime: { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
  seats:    [{ type: Schema.Types.ObjectId, ref: 'Seat', required: true }],
  user:     { type: Schema.Types.ObjectId, ref: 'User' }, // hoặc deviceId nếu chưa login
  createdAt:{ type: Date, default: Date.now },
  expireAt: { type: Date, required: true, index: { expires: 0 } } // TTL
}, { timestamps: true });

module.exports = mongoose.model('Hold', HoldSchema);
