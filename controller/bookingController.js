// controller/bookingController.js
const mongoose = require('mongoose');
const Showtime = require('../models/Showtime');
const Room = require('../models/Room');
const Movie = require('../models/Movie');
const Seat = require('../models/Seat');
const Ticket = require('../models/Ticket');
const TicketSeat = require('../models/TicketSeat');
const TicketCombo = require('../models/TicketCombo');
const Voucher = require('../models/Voucher');

const isId = v => /^[0-9a-fA-F]{24}$/.test(String(v||'').trim());
const HOLD_MINUTES = parseInt(process.env.TICKET_HOLD_MIN || '15', 10);

/** Transaction nếu có replica set; nếu không thì chạy thường */
async function withOptionalTxn(fn) {
  const conn = mongoose.connection;
  const isReplica = !!conn?.client?.topology?.s?.sessionPool; // fallback an toàn
  if (!isReplica) return fn(null);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const rs = await fn(session);
    await session.commitTransaction();
    session.endSession();
    return rs;
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }
}

/** Tính báo giá: showtime + ghế + combos + vouchers */
async function buildQuote({ showtimeId, seatIds = [], combos = [], vouchers = [] }) {
  if (!isId(showtimeId)) throw new Error('Invalid showtimeId');

  const st = await Showtime.findById(showtimeId)
    .populate('room cinema movie')
    .lean();
  if (!st) throw new Error('Showtime not found');

  // seats
  const seats = await Seat.find({ _id: { $in: seatIds } })
    .select('_id row number seat_type extra_price seat_status')
    .lean();
  if (seats.length !== seatIds.length) throw new Error('Some seatIds are invalid');

  // chặn ghế sold/broken
  const bad = seats.find(s => ['sold','broken'].includes(s.seat_status));
  if (bad) throw new Error(`Seat ${bad.row}${bad.number} is not available`);

  const seatLines = seats.map(s => {
    const base = st.ticket_price || 0;
    const extra = s.extra_price || 0;
    return {
      seatId: String(s._id),
      row: s.row, number: s.number, seat_type: s.seat_type,
      price_base: base, price_extra: extra, price_final: base + extra
    };
  });
  const seat_subtotal = seatLines.reduce((a,b)=>a+b.price_final,0);

  // combos (demo: FE gửi unit_price; nếu có Product thì lookup thay thế)
  const comboLines = [];
  let combo_subtotal = 0;
  if (Array.isArray(combos)) {
    for (const c of combos) {
      if (!isId(c.productId)) continue;         // với cách 1, productId là ObjectId thật
      const qty = Number(c.qty||0);
      if (qty<=0) continue;
      const unit = Number(c.unit_price || 0);
      const total = unit * qty;
      comboLines.push({
        productId: c.productId,
        name: c.name || 'Combo',
        type: c.type || 'combo',
        qty, unit_price: unit, total_price: total
      });
      combo_subtotal += total;
    }
  }

  // ======= VOUCHERS: đọc đúng discount_type; áp min/max; không cho total âm =======
  let discount_seat = 0, discount_combo = 0, discount_order = 0;
  const accepted_vouchers = [];

  if (Array.isArray(vouchers) && vouchers.length) {
    const docs = await Voucher.find({ code: { $in: vouchers }, active: true }).lean();
    const now = new Date();

    for (const v of docs) {
      // Bỏ qua nếu hết hạn/ chưa đến hạn / vượt usage limit
      if ((v.start_date && now < v.start_date) || (v.end_date && now > v.end_date)) continue;
      if (v.usage_limit > 0 && v.used_count >= v.usage_limit) continue;

      const scope = v.scope || 'order';                 // 'seat' | 'combo' | 'order'

      // CHÚ THÍCH:
      // v.discount_type === 'percent'  -> giảm theo % (value = phần trăm)
      // v.discount_type === 'amount'   -> giảm số tiền cố định (value = VNĐ)
      const dtype = v.discount_type || 'percent';
      const val   = Number(v.value || 0);
      const max   = (v.max_discount != null) ? Number(v.max_discount) : null;
      const minOrder = Number(v.min_order || 0);

      const applyReduce = (sub) => {
        if (sub <= 0) return 0;
        if (sub < minOrder) return 0;                  // không đủ điều kiện áp mã
        let d = (dtype === 'percent') ? Math.round(sub * (val / 100)) : val;
        if (max != null) d = Math.min(d, max);         // trần giảm tối đa
        d = Math.min(d, sub);                           // không vượt quá phần tính
        return d;
      };

      if (scope === 'seat') {
        const d = applyReduce(seat_subtotal);
        if (d > 0) { discount_seat += d; accepted_vouchers.push(v.code); }
      } else if (scope === 'combo') {
        const d = applyReduce(combo_subtotal);
        if (d > 0) { discount_combo += d; accepted_vouchers.push(v.code); }
      } else {
        const d = applyReduce(seat_subtotal + combo_subtotal);
        if (d > 0) { discount_order += d; accepted_vouchers.push(v.code); }
      }
    }
  }

  const total_before   = seat_subtotal + combo_subtotal;
  const total_discount = discount_seat + discount_combo + discount_order;
  const total_after    = Math.max(0, total_before - total_discount);

  return {
    showtime: st,
    seatLines, comboLines,
    breakdown: {
      seat_subtotal, combo_subtotal, total_before,
      discount_seat, discount_combo, discount_order,
      total_after
    },
    accepted_vouchers
  };
}

/* ======================= API ======================= */

// POST /api/bookings/quote
exports.quote = async (req, res) => {
  try {
    const { showtimeId, seatIds = [], combos = [], vouchers = [] } = req.body || {};
    const data = await buildQuote({ showtimeId, seatIds, combos, vouchers });
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Cannot build quote' });
  }
};

// POST /api/bookings
exports.create = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { showtimeId, seatIds = [], combos = [], vouchers = [] } = req.body || {};
    const payment_method = (req.body.payment_method || 'unknown').toLowerCase();

    await withOptionalTxn(async (session) => {
      const use = session ? { session } : {};

      const quote = await buildQuote({ showtimeId, seatIds, combos, vouchers });
      const { breakdown, seatLines, comboLines, showtime } = quote;

      const cinemaId = showtime.cinema && showtime.cinema._id ? showtime.cinema._id : showtime.cinema;
      const roomId   = showtime.room && showtime.room._id ? showtime.room._id : showtime.room;

      const expires_at = new Date(Date.now() + HOLD_MINUTES * 60000);

      const [ticket] = await Ticket.create([{
        user: userId,
        showtime: showtime._id ? showtime._id : showtimeId,
        cinema: cinemaId,
        room: roomId,
        status: 'pending',
        expires_at,

        seat_subtotal:  breakdown.seat_subtotal,
        combo_subtotal: breakdown.combo_subtotal,
        discount_seat:  breakdown.discount_seat,
        discount_combo: breakdown.discount_combo,
        discount_order: breakdown.discount_order,
        total_before:   breakdown.total_before,
        total_after:    breakdown.total_after,
        voucher_codes:  quote.accepted_vouchers,

        payment_method,
        payment_status: 'unpaid'
      }], use);

      if (seatLines.length) {
        const docs = seatLines.map(s => ({
          ticket: ticket._id,
          showtime: ticket.showtime,
          seat: s.seatId,
          row: s.row,
          number: s.number,
          seat_type: s.seat_type,
          price_base: s.price_base,
          price_extra: s.price_extra,
          price_final: s.price_final,
          status: 'reserved',
          expires_at // TTL key
        }));
        await TicketSeat.insertMany(docs, use);
      }

      if (comboLines.length) {
        const cdocs = comboLines.map(c => ({
          ticket: ticket._id,
          product: c.productId,
          name: c.name,
          type: c.type,
          qty: c.qty,
          unit_price: c.unit_price,
          line_total: c.total_price
        }));
        await TicketCombo.insertMany(cdocs, use);
      }

      return res.status(201).json({
        message: 'Ticket created & seats reserved',
        hold_minutes: HOLD_MINUTES,
        ticket
      });
    });
  } catch (err) { next(err); }
};

// POST /api/bookings/:id/confirm
exports.confirm = async (req, res, next) => {
  try {
    const ticketId = String(req.params.id || '').trim();
    if (!isId(ticketId)) return res.status(400).json({ message: 'Invalid id' });

    await withOptionalTxn(async (session) => {
      const use = session ? { session } : {};

      const t = await Ticket.findById(ticketId);
      if (!t) return res.status(404).json({ message: 'Ticket not found' });
      if (t.status !== 'pending') return res.status(400).json({ message: 'Ticket is not pending' });

      const method = (req.body.payment_method || t.payment_method || 'unknown').toLowerCase();
      const paymentId = req.body.payment_id || null;

      // 1) Snapshot: reserved -> sold, BỎ TTL để không bị xóa
      await TicketSeat.updateMany(
        { ticket: t._id, status: 'reserved', expires_at: { $gt: new Date() } },
        { $set: { status: 'sold' }, $unset: { expires_at: 1 } },
        use
      );

      // 2) Ghế thật -> sold
      const seatDocs = await TicketSeat.find({ ticket: t._id }).select('seat').lean();
      const seatIds = seatDocs.map(s => s.seat);
      if (seatIds.length) {
        await Seat.updateMany({ _id: { $in: seatIds } }, { $set: { seat_status: 'sold' } }, use);
      }

      // 3) Ticket & voucher
      t.status = 'paid';
      t.payment_status = 'paid';
      t.payment_method = method;
      if (paymentId) t.payment_id = paymentId;
      await t.save(use);

      if (t.voucher_codes?.length) {
        await Voucher.updateMany({ code: { $in: t.voucher_codes } }, { $inc: { used_count: 1 } }, use);
      }

      return res.json({ message: 'Payment confirmed & seats sold', ticket: t });
    });
  } catch (err) { next(err); }
};

// GET /api/bookings/:id  (tiện xem chi tiết)
exports.detail = async (req, res, next) => {
  try {
    const id = String(req.params.id||'');
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });

    const t = await Ticket.findById(id)
      .populate('showtime cinema room')
      .lean();
    if (!t) return res.status(404).json({ message: 'Not found' });

    const seats = await TicketSeat.find({ ticket: id }).lean();
    const combos = await TicketCombo.find({ ticket: id }).lean();
    res.json({ ticket: t, seats, combos });
  } catch (e) { next(e); }
};

// POST /api/bookings/:id/cancel (huỷ giữ chỗ ngay)
exports.cancel = async (req, res, next) => {
  try {
    const id = String(req.params.id||'');
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });

    await withOptionalTxn(async (session) => {
      const use = session ? { session } : {};
      const t = await Ticket.findById(id);
      if (!t) return res.status(404).json({ message: 'Not found' });
      if (t.status !== 'pending') return res.status(400).json({ message: 'Only pending can cancel' });

      // xoá snapshot reserved thay vì chờ TTL
      await TicketSeat.deleteMany({ ticket: id, status: 'reserved' }, use);
      t.status = 'cancelled';
      await t.save(use);

      res.json({ message: 'Cancelled' });
    });
  } catch (e) { next(e); }
};
