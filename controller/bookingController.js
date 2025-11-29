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
// QUOTE
// =========================================================
exports.quote = async (req, res) => {
  try {
    const { showtimeId, seatIds = [], combos = [], vouchers = [] } = req.body;

    if (!showtimeId)
      return res.status(400).json({ message: "showtimeId required" });

    const showtime = await Showtime.findById(showtimeId);
    if (!showtime)
      return res.status(404).json({ message: "Showtime not found" });

    const seats = await ShowtimeSeat.find({
      _id: { $in: seatIds },
      showtime: showtimeId,
      status: "available",
    });

    const seat_subtotal = seats.reduce(
      (t, x) => t + showtime.ticket_price + x.extra_price,
      0
    );

    let combo_subtotal = 0;
    for (const c of combos) {
      const p = await Product.findById(c.productId);
      if (p) combo_subtotal += p.price * c.qty;
    }

    let discount_seat = 0,
      discount_combo = 0,
      discount_order = 0;

    for (const code of vouchers) {
      const v = await Voucher.findOne({ code, active: true });
      if (!v) continue;

      let discount = 0;

      if (v.scope === "seat")
        discount =
          v.discount_type === "percent"
            ? seat_subtotal * (v.value / 100)
            : v.value;

      if (v.scope === "combo")
        discount =
          v.discount_type === "percent"
            ? combo_subtotal * (v.value / 100)
            : v.value;

      if (v.scope === "order")
        discount =
          v.discount_type === "percent"
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
// CUSTOMER CREATE (UNPAID)
// =========================================================
// =====================
// CUSTOMER CREATE (UNPAID)
// =====================
exports.create = async (req, res) => {
  try {
    const { showtimeId, seatIds = [], combos = [], vouchers = [], payment_method } =
      req.body;

    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const showtime = await Showtime.findById(showtimeId);
    if (!showtime)
      return res.status(404).json({ message: "Showtime not found" });

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

    const seat_subtotal = validSeats.reduce(
      (t, x) => t + showtime.ticket_price + x.extra_price,
      0
    );

    let combo_subtotal = 0;
    for (const c of combos) {
      const p = await Product.findById(c.productId);
      if (p) combo_subtotal += p.price * c.qty;
    }

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

    // ⭐ SỬA TẠI ĐÂY — ÉP STRING
    const reservation_code = String(Math.floor(10000000 + Math.random() * 90000000));

    const expires_at = new Date(Date.now() + HOLD_MINUTES * 60000);

    const seat_codes = validSeats.map(s => `${s.row}${s.number}`);

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

      seats: seat_codes,

      // ⭐ LƯU STRING
      reservation_code,

      qr_data: "",
      expires_at,
      voucher_codes,
    });

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

    return res.json({
      message: "Ticket created",
      ticket_id: ticket._id,

      // ⭐ TRẢ STRING
      reservation_code,

      seats: seat_codes,
      expires_at,
    });

  } catch (err) {
    res.status(500).json({ message: "Create booking error", error: err.message });
  }
};




exports.staffCreate = async (req, res) => {
  try {
    const { membership_card, showtimeId, seatIds = [], combos = [], payment_method } = req.body;

    if (!showtimeId || !seatIds.length) {
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }

    // ============================
    // 1) KIỂM TRA SUẤT CHIẾU
    // ============================
    const showtime = await Showtime.findById(showtimeId)
      .populate("cinema")
      .populate("room")
      .populate("movie");

    if (!showtime) {
      return res.status(404).json({ message: "Showtime không tồn tại" });
    }

    // ============================
    // 2) LẤY GHẾ TRONG SUẤT CHIẾU
    // ============================
    const stSeats = await ShowtimeSeat.find({
      _id: { $in: seatIds },
      showtime: showtimeId
    });

    if (stSeats.length !== seatIds.length) {
      return res.status(400).json({ message: "Có ghế không hợp lệ hoặc đã bị giữ" });
    }

    // CHECK GHẾ SOLD
    for (const s of stSeats) {
      if (s.status === "sold") {
        return res.status(400).json({ message: `Ghế ${s.row}${s.number} đã bán` });
      }
    }

    // ============================
    // 3) TÍNH TIỀN GHẾ
    // ============================
    let seat_subtotal = 0;
    stSeats.forEach(s => {
      seat_subtotal += Number(showtime.ticket_price) + Number(s.extra_price || 0);

    });

    // ============================
    // 4) TÍNH TIỀN COMBO
    // ============================
    let combo_subtotal = 0;
    let comboDocs = [];

    for (const cb of combos) {
      const prod = await Product.findById(cb.productId);
      if (!prod) continue;

      const line = Number(cb.qty) * Number(prod.price);

      combo_subtotal += line;

      comboDocs.push({
        product: prod._id,
        name: prod.name,
        type: prod.type,
        qty: cb.qty,
        unit_price: prod.price,
        line_total: line
      });
    }

    const total_before = seat_subtotal + combo_subtotal;
    const total_after = total_before; // staff không áp dụng voucher

    // ============================
    // 5) TẠO RESERVATION CODE
    // ============================
    const reservation_code = String(
      Math.floor(10000000 + Math.random() * 90000000)
    );

    // ============================
    // 6) TẠO TICKET
    // ============================
    const ticket = await Ticket.create({
      user: null, // staff bán không có user
      showtime: showtime._id,
      cinema: showtime.cinema._id,
      room: showtime.room._id,
      membership_card,
      reservation_code,
      seat_subtotal,
      combo_subtotal,
      total_before,
      total_after,
      payment_method,
      payment_status: "paid",
      status: "paid"
    });

    // ============================
    // 7) LƯU GHẾ ĐÃ MUA
    // ============================
    for (const s of stSeats) {
      await TicketSeat.create({
        ticket: ticket._id,
        showtime: showtime._id,
        seat: s.seat,
        row: s.row,
        number: s.number,
        seat_type: s.seat_type,
        price_base: showtime.ticket_price,
        price_extra: s.extra_price,
        price_final: Number(showtime.ticket_price) + Number(s.extra_price || 0),

        status: "sold"
      });

      // update trạng thái ghế
      await ShowtimeSeat.updateOne(
        { _id: s._id },
        { status: "sold" }
      );
    }

    // ============================
    // 8) LƯU COMBO
    // ============================
    for (const cb of comboDocs) {
      await TicketCombo.create({
        ticket: ticket._id,
        ...cb
      });
    }

    return res.json({
      message: "OK",
      ticket_id: ticket._id,
      reservation_code
    });

  } catch (err) {
    console.error("❌ STAFF CREATE ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// ======================================================
// CONFIRM (CUSTOMER PAYMENT SUCCESS)
// ======================================================
exports.confirm = async (req, res) => {
  try {
    const ticketId = req.params.id;

    const t = await Ticket.findById(ticketId).populate("user");
    if (!t)
      return res.status(404).json({ message: "Ticket not found" });

    if (t.status === "paid")
      return res.status(400).json({ message: "Ticket already paid" });

    const seats = await TicketSeat.find({ ticket: ticketId });
    const combos = await TicketCombo.find({ ticket: ticketId });

    const showtime = await Showtime.findById(t.showtime)
      .populate("movie")
      .populate("cinema")
      .populate("room");

    // UPDATE SHOWTIME SEAT → SOLD
    for (const s of seats) {
      await ShowtimeSeat.updateOne(
        { showtime: t.showtime, row: s.row, number: s.number },
        { $set: { status: "sold" } }
      );
    }

    // UPDATE TICKET
    t.status = "paid";
    t.payment_status = "paid";
    t.payment_time = new Date();   // ⭐ ALWAYS SET
    t.qr_data = `${t.reservation_code}|${t._id}`;
    t.seats = seats.map(s => `${s.row}${s.number}`);

    await t.save();

    // UPDATE VOUCHER USAGE
    if (t.voucher_codes?.length) {
      await Voucher.updateMany(
        { code: { $in: t.voucher_codes } },
        { $inc: { used_count: 1 } }
      );
    }

    // SEND EMAIL
    await sendTicketEmail(t.user.email, t, showtime, seats, combos);

    res.json({
      message: "Ticket confirmed & email sent",
      ticket_id: t._id,
      qr_data: t.qr_data,
      seats: t.seats,
      payment_time: t.payment_time,
    });
  } catch (e) {
    res.status(500).json({ message: "Confirm error", error: e.message });
  }
};



// ======================================================
// MANUAL EMAIL
// ======================================================
exports.sendEmail = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const t = await Ticket.findById(ticketId).populate("user");
    if (!t)
      return res.status(404).json({ message: "Ticket not found" });

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



// ======================================================
// CANCEL TICKET (SAFE VERSION)
// ======================================================
exports.cancel = async (req, res) => {
  try {
    const id = req.params.id;

    // 1) Lấy ticket
    const ticket = await Ticket.findById(id);
    if (!ticket)
      return res.status(404).json({ message: "Ticket not found" });

    // 2) Update trạng thái ticket
    ticket.status = "cancelled";
    ticket.payment_status = "failed";
    await ticket.save();

    // 3) Lấy đúng danh sách ghế của vé
    const seats = await TicketSeat.find({ ticket: id });

    // 4) Đánh dấu TicketSeat → cancelled
    await TicketSeat.updateMany(
      { ticket: id },
      { $set: { status: "cancelled" } }
    );

    // 5) Trả lại trạng thái available cho đúng ghế trong ShowtimeSeat
    for (const s of seats) {
      await ShowtimeSeat.updateOne(
        {
          showtime: ticket.showtime,
          row: s.row,
          number: s.number
        },
        { $set: { status: "available" } }
      );
    }

    return res.json({
      message: "Ticket cancelled successfully",
      restored_seats: seats.map(s => `${s.row}${s.number}`)
    });

  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ message: "Cancel error", error: err.message });
  }
};




exports.detail = async (req, res) => {
  try {
    const ticketId = req.params.id;

    // =============================
    // 1) Lấy ticket đã populate đầy đủ
    // =============================
    const t = await Ticket.findById(ticketId)
      .populate({
        path: "showtime",
        populate: [
          { path: "movie" },
          { path: "cinema" },
          { path: "room" }
        ]
      })
      .populate("user")
      .lean();

    if (!t)
      return res.status(404).json({ message: "Ticket not found" });

    // =============================
    // 2) Lấy danh sách ghế của vé
    // =============================
    const seats = await TicketSeat.find({ ticket: ticketId })
      .populate("seat")
      .lean();

    // =============================
    // 3) Lấy danh sách combos
    // =============================
    const combos = await TicketCombo.find({ ticket: ticketId })
      .populate("product")
      .lean();

    // =============================
    // 4) Trả dữ liệu đầy đủ
    // =============================
    return res.json({
      ticket: t,
      membership_card: t.membership_card || null,
      seats,
      combos
    });


  } catch (err) {
    console.error("DETAIL ERROR:", err);
    res.status(500).json({
      message: "Detail error",
      error: err.message
    });
  }
};


// GET DETAIL BOOKING (DÙNG CHO WEB-STAFF)
exports.detailBooking = async (req, res) => {
  try {
    const id = req.params.id;

    // 1) Lấy ticket + populate showtime
    const t = await Ticket.findById(id)
      .populate({
        path: "showtime",
        populate: [
          { path: "movie", select: "title duration poster" },
          { path: "cinema", select: "name address" },
          { path: "room", select: "name type" }
        ]
      })
      .lean();

    if (!t)
      return res.status(404).json({ message: "Ticket not found" });

    // 2) Ghế
    const seats = await TicketSeat.find({ ticket: id }).lean();

    // 3) Combo
    const combos = await TicketCombo.find({ ticket: id })
      .populate("product")
      .lean();

    // 4) JSON trả về cho staff
    return res.json({
      _id: t._id,
      status: t.status,
      reservation_code: t.reservation_code || "",

      // Showtime snapshot
      movie_title: t.showtime?.movie?.title || "",
      cinema_name: t.showtime?.cinema?.name || "",
      room_name: t.showtime?.room?.name || "",
      showtime_start: t.showtime?.start_time || null,

      // ------- THẺ THÀNH VIÊN (ĐÃ THÊM) -------
      membership_card: t.membership_card || null,
      // Nếu sau này muốn hiện cả tên user thì dùng:
      // member_name: t.member_name || null,

      // Seats
      seats: seats.map(s => `${s.row}${s.number}`),

      // Combo
      combos: combos.map(cb => ({
        name: cb.name,
        qty: cb.qty,
        unit_price: cb.unit_price,
        line_total: cb.line_total
      })),

      // Voucher
      vouchers: t.voucher_codes || [],

      // GIÁ CHI TIẾT
      seat_subtotal: t.seat_subtotal || 0,
      combo_subtotal: t.combo_subtotal || 0,
      discount_seat: t.discount_seat || 0,
      discount_combo: t.discount_combo || 0,
      discount_order: t.discount_order || 0,

      total_before: t.total_before || 0,
      total_after: t.total_after || 0,
      total: t.total_after || 0
    });

  } catch (err) {
    console.error("detailBooking error:", err);
    res.status(500).json({ message: "Detail booking error", error: err.message });
  }
};


// ======================================================
// MY TICKETS
// ======================================================
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



// ======================================================
// LIST
// ======================================================
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



// ======================================================
// UPDATE STATUS
// ======================================================
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



// ======================================================
// REMOVE
// ======================================================
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
// ======================================================
// STAFF CONFIRM — OFFLINE PAYMENT
// ======================================================
exports.staffConfirm = async (req, res) => {
  try {
    const ticketId = req.params.id;

    // 1) Kiểm tra staff
    const staff = await User.findById(req.user._id);
    if (!staff || staff.role !== "staff")
      return res.status(403).json({ message: "Only staff can confirm offline payments" });

    // 2) Lấy ticket
    const t = await Ticket.findById(ticketId).populate("user");
    if (!t)
      return res.status(404).json({ message: "Ticket not found" });

    if (t.status === "paid")
      return res.status(400).json({ message: "Ticket already paid" });

    // 3) Ghế trong TicketSeat
    const seats = await TicketSeat.find({ ticket: ticketId });
    const combos = await TicketCombo.find({ ticket: ticketId });

    // 4) Update ghế → sold
    for (const s of seats) {
      await ShowtimeSeat.updateOne(
        { showtime: t.showtime, row: s.row, number: s.number },
        { $set: { status: "sold" } }
      );

      // xoá TTL, đổi reserved → sold
      await TicketSeat.updateOne(
        { _id: s._id },
        {
          $set: {
            status: "sold",
            expires_at: null
          }
        }
      );
    }

    // 5) Update ticket
    t.status = "paid";
    t.payment_status = "paid";
    t.payment_method = "cash";
    t.payment_time = new Date();
    t.qr_data = `${t.reservation_code}|${t._id}`;
    await t.save();

    // 6) Cập nhật voucher usage
    if (t.voucher_codes?.length) {
      await Voucher.updateMany(
        { code: { $in: t.voucher_codes } },
        { $inc: { used_count: 1 } }
      );
    }

    // 7) Gửi email nếu có
    if (t.user?.email) {
      const showtime = await Showtime.findById(t.showtime)
        .populate("movie")
        .populate("cinema")
        .populate("room");

      await sendTicketEmail(t.user.email, t, showtime, seats, combos);
    }

    return res.json({
      message: "Offline payment confirmed",
      ticket_id: t._id,
      qr_data: t.qr_data,
      payment_time: t.payment_time
    });

  } catch (err) {
    console.error("staffConfirm error:", err);
    return res.status(500).json({
      message: "Staff confirm error",
      error: err.message
    });
  }
};
// ============================
// STAFF CREATE PENDING — DÙNG CHO VNPAY
// ============================
exports.staffCreatePending = async (req, res) => {
  try {
    const {
      membership_card,
      showtimeId,
      seatIds = [],
      combos = [],
      vouchers = []
    } = req.body;

    const staff = await mongoose
      .model("User")
      .findById(req.user._id)
      .populate("cinema");

    if (!staff)
      return res.status(401).json({ message: "Unauthorized staff" });

    // CHECK MEMBER
    let user = null;
    if (membership_card) {
      user = await mongoose.model("User").findOne({
        membership_card,
        role: "customer",
        status: "active"
      });

      if (!user)
        return res.status(404).json({ message: "Mã thành viên không tồn tại" });
    }

    // SHOWTIME
    const showtime = await Showtime.findById(showtimeId)
      .populate("movie")
      .populate("room");

    if (!showtime)
      return res.status(404).json({ message: "Showtime not found" });

    // VALID SEATS
    const validSeats = [];
    for (const seatId of seatIds) {
      const ss = await ShowtimeSeat.findOne({
        _id: seatId,
        showtime: showtimeId,
        status: "available"
      });
      if (!ss)
        return res.status(400).json({ message: "Some seats not available" });

      validSeats.push(ss);
    }

    const seat_subtotal = validSeats.reduce(
      (s, x) => s + showtime.ticket_price + x.extra_price,
      0
    );

    // COMBO
    let combo_subtotal = 0;
    for (const cb of combos) {
      const p = await Product.findById(cb.productId);
      if (p) combo_subtotal += p.price * (cb.qty || 1);
    }

    const total_before = seat_subtotal + combo_subtotal;
    const total_after = total_before;

    // RESERVATION CODE
    const reservation_code = String(
      Math.floor(10000000 + Math.random() * 90000000)
    );

    const expires_at = new Date(Date.now() + HOLD_MINUTES * 60000);
    const seat_codes = validSeats.map(s => `${s.row}${s.number}`);

    // CREATE PENDING TICKET
    const ticket = await Ticket.create({
      user: user ? user._id : null,
      showtime: showtime._id,
      cinema: staff.cinema?._id,
      room: showtime.room,
      membership_card: user ? user.membership_card : null,

      status: "pending",
      payment_status: "unpaid",
      payment_method: "vnpay",

      seat_subtotal,
      combo_subtotal,
      discount_seat: 0,
      discount_combo: 0,
      discount_order: 0,

      total_before,
      total_after,

      seats: seat_codes,
      reservation_code,
      expires_at,
      voucher_codes: vouchers || []
    });

    // CREATE TICKET SEATS (reserved)
    for (const ss of validSeats) {
      await TicketSeat.create({
        ticket: ticket._id,
        showtime: showtime._id,
        seat: ss._id,
        row: ss.row,
        number: ss.number,
        seat_type: ss.seat_type,
        price_base: showtime.ticket_price,
        price_extra: ss.extra_price,
        price_final: showtime.ticket_price + ss.extra_price,
        status: "reserved",
        expires_at
      });

      ss.status = "holding"; 
      ss.expires_at = expires_at;
      await ss.save();
    }

    return res.json({
      message: "Pending ticket created",
      ticket_id: ticket._id,
      reservation_code,
      amount: total_after,
      seats: seat_codes,
      expires_at
    });

  } catch (err) {
    console.error("staffCreatePending error:", err);
    res.status(500).json({
      message: "Staff create pending error",
      error: err.message
    });
  }
};

