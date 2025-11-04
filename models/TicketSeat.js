// models/TicketSeat.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Snapshot ghế theo vé.
 * TTL sẽ tự xoá bản ghi có expires_at <= now (chỉ set khi status='reserved').
 * Khi confirm: set status='sold' và $unset expires_at để TTL KHÔNG xoá.
 */
const TicketSeatSchema = new Schema({
  ticket:     { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
  showtime:   { type: Schema.Types.ObjectId, ref: 'Showtime', required: true, index: true },
  seat:       { type: Schema.Types.ObjectId, ref: 'Seat', required: true },

  row:        { type: String, required: true },
  number:     { type: Number, required: true },
  seat_type:  { type: String, enum: ['normal','vip','couple'], default: 'normal' },

  price_base:  { type: Number, default: 0 },
  price_extra: { type: Number, default: 0 },
  price_final: { type: Number, default: 0 },

  // reserved -> giữ chỗ, sold -> đã bán, cancelled -> huỷ
  status:     { type: String, enum: ['reserved','sold','cancelled'], default: 'reserved', index: true },

  /**
   * TTL KEY: CHỈ set giá trị này khi status='reserved'
   * MongoDB sẽ tự xoá document khi expires_at <= now.
   * Lưu ý: TTL chạy theo chu kỳ (~60s), không phải realtime từng mili-giây.
   */
  expires_at: { type: Date, default: null }
}, { timestamps: true });

// Không cho 1 vé giữ cùng 1 seat 2 lần
TicketSeatSchema.index({ ticket: 1, seat: 1 }, { unique: true });

// TTL index: xoá doc khi expires_at tới hạn
// (ĐỪNG dùng compound/partial ở TTL; chỉ một field duy nhất)
TicketSeatSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TicketSeat', TicketSeatSchema);
