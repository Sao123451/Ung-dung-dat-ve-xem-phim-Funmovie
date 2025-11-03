// models/Showtime.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShowtimeSchema = new Schema({
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  cinema: { type: Schema.Types.ObjectId, ref: 'Cinema', required: true },
  room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  start_time: { type: Date, required: true },
  end_time:   { type: Date }, // có thể tự tính từ duration
  ticket_price: { type: Number, required: true },
  status: { type: String, enum: ['scheduled','ongoing','finished','cancelled'], default: 'scheduled' },
  available_seats: { type: Number, default: 0 }
}, { timestamps: true });

// Index phục vụ tra cứu theo rạp/phòng/ngày
ShowtimeSchema.index({ cinema: 1, room: 1, start_time: 1 });
ShowtimeSchema.index({ room: 1, start_time: 1, end_time: 1 });

module.exports = mongoose.model('Showtime', ShowtimeSchema);
    