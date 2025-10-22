// models/Showtime.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShowtimeSchema = new Schema({
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  cinema: { type: Schema.Types.ObjectId, ref: 'Cinema', required: true },
  room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  start_time: { type: Date, required: true },
  end_time: { type: Date },
  ticket_price: { type: Number, required: true },
  status: { type: String, enum: ['scheduled','ongoing','finished','cancelled'], default: 'scheduled' },
  available_seats: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Showtime', ShowtimeSchema);
