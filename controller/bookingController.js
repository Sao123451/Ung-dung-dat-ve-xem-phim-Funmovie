// ======================= IMPORT =========================
const mongoose = require("mongoose");
const Showtime = require("../models/Showtime");
const ShowtimeSeat = require("../models/ShowtimeSeat");
const Ticket = require("../models/Ticket");
const TicketSeat = require("../models/TicketSeat");
const TicketCombo = require("../models/TicketCombo");
const Voucher = require("../models/Voucher");
const Product = require("../models/Product");
const User = require("../models/User");
const sendTicketEmail = require("../services/email.service");

const HOLD_MINUTES = parseInt(process.env.TICKET_HOLD_MIN || "15", 10);


// =========================================================
//                      QUOTE
// =========================================================
exports.quote = async (req, res) => {
  try {
    const { showtimeId, seatIds = [], combos = [], vouchers = [] } = req.body;

    if (!showtimeId)
      return res.status(400).json({ message: "showtimeId required" });

    const showtime = await Showtime.findById(showtimeId);
    if (!showtime)
      return res.status(404).json({ message: "Showtime not found" });

    // ===== GET VALID SEATS =====
    const seats = await ShowtimeSeat.find({
      _id: { $in: seatIds },
      showtime: showtimeId,
      status: "available",
    });

    const seat_subtotal = seats.reduce(
      (t, x) => t + showtime.ticket_price + x.extra_price,
      0
    );

    // ===== COMBO SUBTOTAL =====
    let combo_subtotal = 0;
    for (const c of combos) {
      const p = await Product.findById(c.productId);
      if (p) combo_subtotal += p.price * c.qty;
    }

    // ===== VOUCHERS =====
    let discount_seat = 0,
      discount_combo = 0,
      discount_order = 0;

    for (const code of vouchers) {
      const v = await Voucher.findOne({ code, active: true });
      if (!v) continue;

      let discount = 0;

      if (v.scope === "seat")
        discount = v.discount_type === "percent"
          ? seat_subtotal * (v.value / 100)
          : v.value;

      if (v.scope === "combo")
        discount = v.discount_type === "percent"
          ? combo_subtotal * (v.value / 100)
          : v.value;

      if (v.scope === "order")
        discount = v.discount_type === "percent"
          ? (seat_subtotal + combo_subtotal) * (v.value / 100)
          : v.value;

      if (v.max_discount) discount = Math.min(discount, v.max_discount);

      if (v.scope === "seat") discount_seat += discount;
      if (v.scope === "combo") discount_combo += discount;
      if (v.scope === "order") discount_order += discount;
    }

    const total_before = seat_subtotal + combo_subtotal;
    const total_after =
      total_before - (discount_seat + discount_combo + discount_order);

    return res.json({
      breakdown: {
        seat_subtotal,
        combo_subtotal,
        discount_seat,
        discount_combo,
        discount_order,
        total_after,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Quote error", error: err.message });
  }
};



// =========================================================
//                      CUSTOMER CREATE
// =========================================================
exports.create = async (req, res) => {
  try {
    const {
      showtimeId,
      seatIds = [],
      combos = [],
      vouchers = [],
      payment_method,
    } = req.body;

    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const showtime = await Showtime.findById(showtimeId);
    if (!showtime)
      return res.status(404).json({ message: "Showtime not found" });

    // ===== VALIDATE SEATS =====
    const validSeats = [];
    for (const id of seatIds) {
      const ss = await ShowtimeSeat.findOne({
        _id: id,
        showtime: showtimeId,
        status: "available",
      });

      if (!ss)
        return res.status(400).json({ message: "Some seats not available" });

      validSeats.push(ss);
    }

    // ===== CALCULATE =====
    const seat_subtotal = validSeats.reduce(
      (t, x) => t + showtime.ticket_price + x.extra_price,
      0
    );

    let combo_subtotal = 0;
    for (const c of combos) {
      const p = await Product.findById(c.productId);
      if (p) combo_subtotal += p.price * c.qty;
    }

    // ===== VOUCHER =====
    let discount_seat = 0,
      discount_combo = 0,
      discount_order = 0;
    const voucher_codes = [];

    for (const code of vouchers) {
      const v = await Voucher.findOne({ code, active: true });
      if (!v) continue;

      voucher_codes.push(code);

      let discount = 0;

      if (v.scope === "seat")
        discount = v.discount_type === "percent"
          ? seat_subtotal * (v.value / 100)
          : v.value;

      if (v.scope === "combo")
        discount = v.discount_type === "percent"
          ? combo_subtotal * (v.value / 100)
          : v.value;

      if (v.scope === "order")
        discount = v.discount_type === "percent"
          ? (seat_subtotal + combo_subtotal) * (v.value / 100)
          : v.value;

      if (v.max_discount) discount = Math.min(discount, v.max_discount);

      if (v.scope === "seat") discount_seat += discount;
      if (v.scope === "combo") discount_combo += discount;
      if (v.scope === "order") discount_order += discount;
    }

    const total_before = seat_subtotal + combo_subtotal;
    const total_after =
      total_before - (discount_seat + discount_combo + discount_order);

    // ===== RESERVATION =====
    const reservation_code = Math.floor(10000000 + Math.random() * 90000000);
    const qr_data = `${reservation_code}|${user._id}`;
    const expires_at = new Date(Date.now() + HOLD_MINUTES * 60000);

    // ===== CREATE TICKET =====
    const ticket = await Ticket.create({
      user: user._id,
      showtime: showtimeId,
      cinema: showtime.cinema,
      room: showtime.room,
      membership_card: user.membership_card || null,

      status: "pending",
      payment_status: "unpaid",
      payment_method: payment_method || "unknown",

      seat_subtotal,
      combo_subtotal,
      discount_seat,
      discount_combo,
      discount_order,
      total_before,
      total_after,

      reservation_code,
      qr_data,
      expires_at,
      voucher_codes,
    });

    // ===== CREATE TICKET SEATS =====
    for (const ss of validSeats) {
      await TicketSeat.create({
        ticket: ticket._id,
        showtime: showtimeId,
        seat: ss.seat,
        row: ss.row,
        number: ss.number,
        seat_type: ss.seat_type,
        price_base: showtime.ticket_price,
        price_extra: ss.extra_price,
        price_final: showtime.ticket_price + ss.extra_price,
        status: "reserved",
        expires_at,
      });

      await ShowtimeSeat.updateOne(
        { _id: ss._id },
        { status: "holding" }
      );
    }

    // ===== COMBO CREATE =====
    for (const c of combos) {
      const p = await Product.findById(c.productId);
      if (!p) continue;

      await TicketCombo.create({
        ticket: ticket._id,
        product: p._id,
        name: p.name,
        type: p.type,
        qty: c.qty,
        unit_price: p.price,
        line_total: p.price * c.qty,
      });
    }

    return res.json({
      message: "Ticket created",
      ticket_id: ticket._id,
      reservation_code,
      qr_data,
      expires_at,
    });
  } catch (err) {
    res.status(500).json({ message: "Create booking error", error: err.message });
  }
};



/* ======================================================
   STAFF CREATE (TẠI QUẦY) – SHOW CINEMA FROM STAFF
====================================================== */
exports.staffCreate = async (req, res) => {
  try {
    const {
      membership_card,
      showtimeId,
      seatIds = [],
      combos = [],
      payment_method,
      email_override,
    } = req.body;

    // ⭐ Staff phải populate cinema để lấy name/address
    const staff = await mongoose.model("User")
      .findById(req.user._id)
      .populate("cinema");

    if (!staff)
      return res.status(401).json({ message: "Unauthorized staff" });

    // ⭐ User theo membership card (nếu có)
    let user = null;

    if (membership_card) {
      user = await mongoose.model("User").findOne({
        membership_card,
        role: "customer",
        status: "active",
      });

      if (!user)
        return res.status(404).json({ message: "Mã thành viên không tồn tại" });
    }

    const showtime = await Showtime.findById(showtimeId)
      .populate("movie")
      .populate("room");

    if (!showtime)
      return res.status(404).json({ message: "Showtime not found" });

    // ----- GHẾ -----
    const validSeats = [];
    for (const seatId of seatIds) {
      const ss = await ShowtimeSeat.findOne({
        _id: seatId,
        showtime: showtimeId,
        status: "available",
      });
      if (!ss)
        return res.status(400).json({ message: "Some seats not available" });

      validSeats.push(ss);
    }

    // ----- TÍNH TIỀN -----
    const seat_subtotal = validSeats.reduce(
      (s, x) => s + showtime.ticket_price + x.extra_price,
      0
    );

    let combo_subtotal = 0;
    for (const cb of combos) {
      const p = await mongoose.model("Product").findById(cb.productId);
      if (!p) continue;
      combo_subtotal += p.price * cb.qty;
    }

    const total_before = seat_subtotal + combo_subtotal;
    const total_after = total_before;

    const reservation_code =
      Math.floor(10000000 + Math.random() * 90000000).toString();

    const qr_data = `${reservation_code}|${user ? user._id : "guest"}`;

    // ⭐ SAVE SNAPSHOT RẠP – phòng khi cinema thay đổi sau này
    const cinema_snapshot = {
      name: staff.cinema?.name || "Không xác định",
      address: staff.cinema?.address || "",
      city: staff.cinema?.city || "",
    };

    // ----- TẠO VÉ -----
    const ticket = await Ticket.create({
      user: user ? user._id : null,
      showtime: showtime._id,

      // ⭐ VÉ CHO STAFF → LUÔN LẤY RẠP THEO STAFF
      cinema: staff.cinema?._id,
      room: showtime.room,

      cinema_snapshot, // ⭐ LẤY THÔNG TIN RẠP STAFF

      membership_card: user ? user.membership_card : null,
      status: "paid",
      payment_status: "paid",
      payment_method: payment_method || "cash",

      seat_subtotal,
      combo_subtotal,
      discount_seat: 0,
      discount_combo: 0,
      discount_order: 0,

      total_before,
      total_after,

      reservation_code,
      qr_data,
      voucher_codes: [],
    });

    // ----- GHẾ SOLD -----
    for (const ss of validSeats) {
      await TicketSeat.create({
        ticket: ticket._id,
        showtime: showtime._id,
        seat: ss.seat,
        row: ss.row,
        number: ss.number,
        seat_type: ss.seat_type,
        price_base: showtime.ticket_price,
        price_extra: ss.extra_price,
        price_final: showtime.ticket_price + ss.extra_price,
        status: "sold",
      });

      await ShowtimeSeat.updateOne(
        { _id: ss._id },
        { $set: { status: "sold" } }
      );
    }

    // ----- COMBO -----
    for (const cb of combos) {
      const p = await mongoose.model("Product").findById(cb.productId);
      if (!p) continue;

      await TicketCombo.create({
        ticket: ticket._id,
        product: p._id,
        name: p.name,
        type: p.type,
        qty: cb.qty,
        unit_price: p.price,
        line_total: p.price * cb.qty,
      });
    }

    // ----- EMAIL -----
    const emailToSend = email_override || (user ? user.email : null);

    if (emailToSend) {
      try {
        const seats = await TicketSeat.find({ ticket: ticket._id });
        const combosData = await TicketCombo.find({ ticket: ticket._id });

        // ⭐ TRUYỀN CINEMA SNAPSHOT SANG EMAIL
        await sendTicketEmail(emailToSend, ticket, showtime, seats, combosData);
      } catch (e) {
        console.log("Email error:", e.message);
      }
    }

    res.json({
      message: "Staff created ticket successfully",
      ticket_id: ticket._id,
      membership_card: membership_card || null,
      reservation_code,
      user_type: user ? "member" : "guest",
    });
  } catch (err) {
    res.status(500).json({
      message: "Staff create error",
      error: err.message,
    });
  }
};

/* ======================================================
   CONFIRM
====================================================== */
exports.confirm = async (req, res) => {
  try {
    const ticketId = req.params.id;

    const t = await Ticket.findById(ticketId).populate("user");
    if (!t) return res.status(404).json({ message: "Ticket not found" });

    if (t.status === "paid")
      return res.status(400).json({ message: "Ticket already paid" });

    const seats = await TicketSeat.find({ ticket: ticketId });
    const combos = await TicketCombo.find({ ticket: ticketId });

    const showtime = await Showtime.findById(t.showtime)
      .populate("movie")
      .populate("cinema")
      .populate("room");

    for (const s of seats) {
      await ShowtimeSeat.updateOne(
        { showtime: t.showtime, seat: s.seat },
        { $set: { status: "sold" } }
      );
    }

    t.status = "paid";
    t.payment_status = "paid";
    t.payment_time = new Date();
    await t.save();

    if (t.voucher_codes?.length) {
      await Voucher.updateMany(
        { code: { $in: t.voucher_codes } },
        { $inc: { used_count: 1 } }
      );
    }

    await sendTicketEmail(t.user.email, t, showtime, seats, combos);

    res.json({
      message: "Ticket confirmed & email sent",
      ticket_id: t._id,
      payment_time: t.payment_time,
    });
  } catch (e) {
    res.status(500).json({ message: "Confirm error", error: e.message });
  }
};

/* ======================================================
   ADMIN SEND EMAIL AGAIN
====================================================== */
exports.sendEmail = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const t = await Ticket.findById(ticketId).populate("user");
    if (!t) return res.status(404).json({ message: "Ticket not found" });

    const seats = await TicketSeat.find({ ticket: ticketId });
    const combos = await TicketCombo.find({ ticket: ticketId });

    const showtime = await Showtime.findById(t.showtime)
      .populate("movie")
      .populate("cinema")
      .populate("room");

    await sendTicketEmail(email, t, showtime, seats, combos);

    res.json({
      message: "Ticket email sent successfully",
      ticket_id: t._id,
    });
  } catch (e) {
    res.status(500).json({ message: "Send email error", error: e.message });
  }
};

/* ======================================================
   CANCEL
====================================================== */
exports.cancel = async (req, res) => {
  try {
    const id = req.params.id;

    const ticket = await Ticket.findById(id);
    if (!ticket)
      return res.status(404).json({ message: "Ticket not found" });

    ticket.status = "cancelled";
    ticket.payment_status = "failed";
    await ticket.save();

    await TicketSeat.updateMany(
      { ticket: id },
      { $set: { status: "cancelled" } }
    );

    await ShowtimeSeat.updateMany(
      { showtime: ticket.showtime },
      { $set: { status: "available" } }
    );

    res.json({ message: "Ticket cancelled" });
  } catch (err) {
    res.status(500).json({ message: "Cancel error" });
  }
};

/* ======================================================
   DETAIL
====================================================== */
exports.detail = async (req, res) => {
  try {
    const t = await Ticket.findById(req.params.id).lean();
    if (!t) return res.status(404).json({ message: "Ticket not found" });
    res.json(t);
  } catch (err) {
    res.status(500).json({ message: "Detail error" });
  }
};

/* ======================================================
   MY TICKETS
====================================================== */
exports.myTickets = async (req, res) => {
  try {
    const items = await Ticket.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "My tickets error" });
  }
};

/* ======================================================
   LIST
====================================================== */
exports.list = async (req, res) => {
  try {
    const items = await Ticket.find()
      .populate("user", "email full_name membership_card")
      .populate("showtime")
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "List error" });
  }
};

/* ======================================================
   UPDATE STATUS
====================================================== */
exports.updateStatus = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket)
      return res.status(404).json({ message: "Ticket not found" });

    ticket.status = req.body.status || ticket.status;
    await ticket.save();

    res.json({ message: "Ticket status updated" });
  } catch (err) {
    res.status(500).json({ message: "Update status error" });
  }
};

/* ======================================================
   REMOVE
====================================================== */
exports.remove = async (req, res) => {
  try {
    const t = await Ticket.findById(req.params.id);
    if (!t)
      return res.status(404).json({ message: "Ticket not found" });

    await TicketSeat.deleteMany({ ticket: t._id });
    await TicketCombo.deleteMany({ ticket: t._id });
    await t.deleteOne();

    res.json({ message: "Ticket removed" });
  } catch (err) {
    res.status(500).json({ message: "Remove error" });
  }
};
