// controller/bookingController.js
const mongoose = require('mongoose');
const Showtime = require('../models/Showtime');
const ShowtimeSeat = require('../models/ShowtimeSeat');   // ⭐ FIX: dùng ShowtimeSeat
const Ticket = require('../models/Ticket');
const TicketSeat = require('../models/TicketSeat');
const TicketCombo = require('../models/TicketCombo');
const Voucher = require('../models/Voucher');

const isId = v => /^[0-9a-fA-F]{24}$/.test(String(v||'').trim());
const HOLD_MINUTES = parseInt(process.env.TICKET_HOLD_MIN || '15', 10);


/* ======================================================
   TRANSACTION HELPER
====================================================== */
async function withOptionalTxn(fn) {
  const conn = mongoose.connection;
  const isReplica = !!conn?.client?.topology?.s?.sessionPool;
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


exports.detail = async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (!isId(id)) return res.status(400).json({ message: "Invalid id" });

    const t = await Ticket.findById(id)
      .populate('showtime cinema room')
      .lean();
    if (!t) return res.status(404).json({ message: "Not found" });

    const seats = await TicketSeat.find({ ticket: id }).lean();
    const combos = await TicketCombo.find({ ticket: id }).lean();

    res.json({ ticket: t, seats, combos });
  } catch (e) { next(e); }
};


/* ======================================================
   BUILD QUOTE — đã update hoàn toàn theo ShowtimeSeat
====================================================== */
async function buildQuote({ showtimeId, seatIds = [], combos = [], vouchers = [] }) {

  if (!isId(showtimeId)) throw new Error('Invalid showtimeId');

  const st = await Showtime.findById(showtimeId)
    .populate('room cinema movie')
    .lean();
  if (!st) throw new Error('Showtime not found');


  /* ============================
     ⭐ FIX: LẤY GHẾ TỪ ShowtimeSeat
  ============================ */
  const stSeats = await ShowtimeSeat.find({
    showtime: showtimeId,
    _id: { $in: seatIds }
  })
    .select('_id row number seat_type extra_price status')
    .lean();

  if (stSeats.length !== seatIds.length)
    throw new Error('Some seats are invalid');


  /* ============================
     ⭐ FIX: CHẶN GHẾ sold / broken / holding
  ============================ */
  const bad = stSeats.find(s =>
    ['sold', 'broken', 'holding'].includes(s.status)
  );
  if (bad)
    throw new Error(`Seat ${bad.row}${bad.number} is not available`);


  /* ============================
     TÍNH TIỀN GHẾ
  ============================ */
  const seatLines = stSeats.map(s => {
    const base = st.ticket_price || 0;
    const extra = s.extra_price || 0;
    return {
      seatId: String(s._id),
      row: s.row,
      number: s.number,
      seat_type: s.seat_type,
      price_base: base,
      price_extra: extra,
      price_final: base + extra
    };
  });

  const seat_subtotal = seatLines.reduce((a,b) => a + b.price_final, 0);


  /* ============================
     COMBOS
  ============================ */
  const comboLines = [];
  let combo_subtotal = 0;

  if (Array.isArray(combos)) {
    for (const c of combos) {
      const qty = Number(c.qty || 0);
      if (qty <= 0) continue;

      const unit = Number(c.unit_price || 0);
      const line = qty * unit;

      comboLines.push({
        productId: c.productId,
        name: c.name,
        type: c.type,
        qty,
        unit_price: unit,
        total_price: line
      });

      combo_subtotal += line;
    }
  }


  /* ============================
     VOUCHERS (giữ nguyên)
  ============================ */
  let discount_seat = 0, discount_combo = 0, discount_order = 0;
  const accepted_vouchers = [];
  const now = new Date();

  if (Array.isArray(vouchers) && vouchers.length) {
    const docs = await Voucher.find({ code: { $in: vouchers }, active: true }).lean();

    for (const v of docs) {
      if ((v.start_date && now < v.start_date) || (v.end_date && now > v.end_date))
        continue;

      if (v.usage_limit > 0 && v.used_count >= v.usage_limit)
        continue;

      const scope = v.scope || 'order';

      const dtype = v.discount_type || 'percent';
      const val = Number(v.value || 0);
      const max = (v.max_discount != null) ? Number(v.max_discount) : null;
      const minOrder = Number(v.min_order || 0);

      const applyReduce = (sub) => {
        if (sub <= 0) return 0;
        if (sub < minOrder) return 0;
        let d = (dtype === 'percent') ? Math.round(sub * val / 100) : val;
        if (max != null) d = Math.min(d, max);
        return Math.min(d, sub);
      };

      if (scope === 'seat') {
        const d = applyReduce(seat_subtotal);
        if (d > 0) { discount_seat += d; accepted_vouchers.push(v.code); }
      }
      else if (scope === 'combo') {
        const d = applyReduce(combo_subtotal);
        if (d > 0) { discount_combo += d; accepted_vouchers.push(v.code); }
      }
      else {
        const d = applyReduce(seat_subtotal + combo_subtotal);
        if (d > 0) { discount_order += d; accepted_vouchers.push(v.code); }
      }
    }
  }

  const total_before = seat_subtotal + combo_subtotal;
  const total_discount = discount_seat + discount_combo + discount_order;
  const total_after = Math.max(0, total_before - total_discount);

  return {
    showtime: st,
    seatLines,
    comboLines,
    breakdown: {
      seat_subtotal,
      combo_subtotal,
      total_before,
      discount_seat,
      discount_combo,
      discount_order,
      total_after
    },
    accepted_vouchers
  };
}


/* ======================================================
   POST /api/bookings/quote
====================================================== */
exports.quote = async (req, res) => {
  try {
    const { showtimeId, seatIds = [], combos = [], vouchers = [] } = req.body || {};
    const data = await buildQuote({ showtimeId, seatIds, combos, vouchers });
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


/* ======================================================
   POST /api/bookings
====================================================== */
exports.create = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const { showtimeId, seatIds = [], combos = [], vouchers = [], payment_method } = req.body;
    const method = (payment_method || 'unknown').toLowerCase();

    await withOptionalTxn(async (session) => {
      const use = session ? { session } : {};

      const quote = await buildQuote({ showtimeId, seatIds, combos, vouchers });
      const { breakdown, seatLines, comboLines, showtime } = quote;

      const cinemaId = showtime.cinema._id || showtime.cinema;
      const roomId = showtime.room._id || showtime.room;

      const expires_at = new Date(Date.now() + HOLD_MINUTES * 60000);

      const [ticket] = await Ticket.create([{
        user: userId,
        showtime: showtimeId,
        cinema: cinemaId,
        room: roomId,

        status: 'pending',
        expires_at,

        seat_subtotal: breakdown.seat_subtotal,
        combo_subtotal: breakdown.combo_subtotal,
        discount_seat: breakdown.discount_seat,
        discount_combo: breakdown.discount_combo,
        discount_order: breakdown.discount_order,
        total_before: breakdown.total_before,
        total_after: breakdown.total_after,

        voucher_codes: quote.accepted_vouchers,

        payment_method: method,
        payment_status: 'unpaid'

      }], use);


      /* ============================
         ⭐ FIX: GHẾ ĐẶT → ShowtimeSeat.status = holding
      ============================ */
      if (seatIds.length) {
        await ShowtimeSeat.updateMany(
          { _id: { $in: seatIds }, status: { $in: ['available','holding'] } },
          { $set: { status: 'holding' } },
          use
        );
      }


      /* ============================
         Snapshot TicketSeat
      ============================ */
      if (seatLines.length) {
        const docs = seatLines.map(s => ({
          ticket: ticket._id,
          showtime: showtimeId,
          seat: s.seatId,
          row: s.row,
          number: s.number,
          seat_type: s.seat_type,
          price_base: s.price_base,
          price_extra: s.price_extra,
          price_final: s.price_final,

          status: 'reserved',
          expires_at
        }));

        await TicketSeat.insertMany(docs, use);
      }


      /* ============================
         Combos
      ============================ */
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



/* ======================================================
   POST /api/bookings/:id/confirm
====================================================== */
exports.confirm = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    if (!isId(ticketId)) return res.status(400).json({ message: "Invalid id" });

    await withOptionalTxn(async (session) => {
      const use = session ? { session } : {};

      const t = await Ticket.findById(ticketId);
      if (!t) return res.status(404).json({ message: 'Ticket not found' });
      if (t.status !== 'pending')
        return res.status(400).json({ message: 'Ticket is not pending' });

      /* ============================
         ⭐ Fix: GHẾ -> sold (ShowtimeSeat)
      ============================ */
      const reserved = await TicketSeat.find({ ticket: t._id })
        .select('seat')
        .lean();

      const seatIds = reserved.map(s => s.seat);

      if (seatIds.length) {
        await ShowtimeSeat.updateMany(
          { _id: { $in: seatIds }, status: { $ne: 'broken' } },
          { $set: { status: 'sold' } },
          use
        );
      }

      await TicketSeat.updateMany(
        { ticket: t._id },
        { $set: { status: 'sold' }, $unset: { expires_at: 1 } },
        use
      );

      t.status = 'paid';
      t.payment_status = 'paid';
      t.payment_method = req.body.payment_method || t.payment_method;
      if (req.body.payment_id) t.payment_id = req.body.payment_id;

      await t.save(use);

      if (t.voucher_codes?.length) {
        await Voucher.updateMany(
          { code: { $in: t.voucher_codes } },
          { $inc: { used_count: 1 } },
          use
        );
      }

      res.json({ message: "Payment confirmed", ticket: t });
    });

  } catch (err) { next(err); }
};


/* ======================================================
   POST /api/bookings/:id/cancel
====================================================== */
exports.cancel = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isId(id)) return res.status(400).json({ message: "Invalid id" });

    await withOptionalTxn(async (session) => {
      const use = session ? { session } : {};

      const t = await Ticket.findById(id);
      if (!t) return res.status(404).json({ message: 'Not found' });
      if (t.status !== 'pending')
        return res.status(400).json({ message: 'Only pending can cancel' });


      /* ============================
         ⭐ FIX: TRẢ GHẾ → ShowtimeSeat.status = available
      ============================ */
      const docs = await TicketSeat.find({
        ticket: id,
        status: 'reserved'
      }).select('seat').lean();

      const seatIds = docs.map(s => s.seat);

      if (seatIds.length) {
        await ShowtimeSeat.updateMany(
          { _id: { $in: seatIds }, status: 'holding' },
          { $set: { status: 'available' } },
          use
        );
      }

      await TicketSeat.deleteMany({ ticket: id }, use);

      t.status = 'cancelled';
      await t.save(use);

      res.json({ message: "Cancelled" });
    });

  } catch (err) { next(err); }
};
