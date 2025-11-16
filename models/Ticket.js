// models/Ticket.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSchema = new Schema(
  {
    // ===============================
    // USER & SHOWTIME
    // ===============================
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    showtime: { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
    cinema: { type: Schema.Types.ObjectId, ref: 'Cinema' },
    room: { type: Schema.Types.ObjectId, ref: 'Room' },

    // ⭐ NEW: Lưu membership card của khách hàng
    membership_card: { type: String, default: null },

    // ===============================
    // STATUS
    // ===============================
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending'
    },

    payment_method: {
      type: String,
      enum: ['momo', 'zalopay', 'vnpay', 'cash', 'testpay', 'unknown'],
      default: 'unknown'
    },

    payment_status: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded', 'failed'],
      default: 'unpaid'
    },

    payment_id: { type: String, default: null },
    payment_time: { type: Date, default: null },

    // ===============================
    // PRICE BREAKDOWN
    // ===============================
    seat_subtotal: { type: Number, default: 0 },
    combo_subtotal: { type: Number, default: 0 },

    discount_seat: { type: Number, default: 0 },
    discount_combo: { type: Number, default: 0 },
    discount_order: { type: Number, default: 0 },

    total_before: { type: Number, default: 0 },
    total_after: { type: Number, default: 0 },

    voucher_codes: [{ type: String }],

    // ===============================
    // SNAPSHOT
    // ===============================

    reservation_code: { type: String, required: true, unique: true }, // Mã vé

    qr_data: { type: String, required: true },

    seats: [{ type: String }], // Ví dụ: ["A5", "A6"]

    movie_snapshot: {
      title: String,
      rating: String
    },

    cinema_snapshot: {
      name: String,
      address: String
    },

    room_snapshot: {
      name: String,
      type: String
    },

    showtime_snapshot: {
      date: String,
      time: String
    },

    // ===============================
    // EXPIRATION
    // ===============================
    expires_at: { type: Date, default: null }

  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', TicketSchema);
