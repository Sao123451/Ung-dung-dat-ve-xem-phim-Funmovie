// controller/ticketController.js
const Ticket = require('../models/Ticket');
const TicketSeat = require('../models/TicketSeat');
const ShowtimeSeat = require('../models/ShowtimeSeat');
const Showtime = require('../models/Showtime');
const TicketCombo = require("../models/TicketCombo");


/* ======================================================
   CUSTOMER — LẤY DANH SÁCH VÉ CỦA TÔI
====================================================== */
exports.myTickets = async (req, res) => {
  const items = await Ticket.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .lean();
  res.json(items);
};

/* ======================================================
   CUSTOMER — XEM CHI TIẾT VÉ
====================================================== */
exports.detail = async (req, res) => {
  const t = await Ticket.findById(req.params.id).lean();
  if (!t) return res.status(404).json({ message: "Not found" });
  res.json(t);
};

/* ======================================================
   QR — TRẢ VỀ DỮ LIỆU QR
====================================================== */
exports.getQR = async (req, res) => {
  const t = await Ticket.findById(req.params.id).lean();
  if (!t) return res.status(404).json({ message: "Not found" });
  res.json({ qr_data: t.qr_data });
};

/* ======================================================
   ADMIN — LIST VÉ
====================================================== */
exports.list = async (req, res) => {
  const items = await Ticket.find().sort({ createdAt: -1 }).lean();
  res.json(items);
};

/* ======================================================
   CUSTOMER — HUỶ VÉ
====================================================== */
exports.cancelMy = async (req, res) => {
  try {
    const id = req.params.id;

    const t = await Ticket.findOne({
      _id: id,
      user: req.user._id
    });

    if (!t) return res.status(404).json({ message: "Not found" });

    t.status = "cancelled";
    t.payment_status = "failed";
    await t.save();

    await TicketSeat.updateMany(
      { ticket: id },
      { $set: { status: 'cancelled' } }
    );

    for (const code of t.seats) {
      const row = code[0];
      const number = Number(code.slice(1));

      await ShowtimeSeat.updateOne(
        { showtime: t.showtime, row, number },
        { $set: { status: 'available' } }
      );
    }

    res.json({ message: "Ticket cancelled" });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Cancel failed" });
  }
};

/* ======================================================
   ADMIN — CẬP NHẬT TRẠNG THÁI VÉ
====================================================== */
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const t = await Ticket.findById(req.params.id);
    if (!t) return res.status(404).json({ message: "not found" });

    t.status = status;
    await t.save();

    res.json({ message: "Updated", ticket: t });
  } catch (e) {
    res.status(500).json({ message: "Update error" });
  }
};

/* ======================================================
   ADMIN — XOÁ VÉ
====================================================== */
exports.remove = async (req, res) => {
  try {
    const id = req.params.id;

    await Ticket.deleteOne({ _id: id });
    await TicketSeat.deleteMany({ ticket: id });

    res.json({ message: "Deleted ticket" });
  } catch (e) {
    res.status(500).json({ message: "Delete failed" });
  }
};

/* ======================================================
   CUSTOMER — TẠO VÉ (không dùng, bookingController xử lý)
====================================================== */
exports.create = async (req, res) => {
  res.status(400).json({
    message: "Ticket creation must be done via /api/bookings"
  });
};

/* ======================================================
   FIND TICKET BY RESERVATION CODE
====================================================== */
exports.findByCode = async (req, res) => {
  try {
    const code = req.params.code;

    const ticket = await Ticket.findOne({ reservation_code: code })
      .populate("user", "full_name email membership_card")
      .populate("showtime")
      .populate("cinema")
      .populate("room")
      .lean();

    if (!ticket)
      return res.status(404).json({ message: "Ticket not found" });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Find ticket error", error: err.message });
  }
};

/* ======================================================
   RELEASE HOLDING SEATS — trả ghế về available ngay lập tức
====================================================== */
  exports.releaseHoldingSeats = async (req, res) => {
    try {
      const { seatIds = [] } = req.body;

      if (!seatIds.length)
        return res.status(400).json({ message: "seatIds required" });

      // 1) SHOWTIMESEAT holding -> available
      await ShowtimeSeat.updateMany(
        { _id: { $in: seatIds }, status: "holding" },
        { $set: { status: "available", expires_at: null } }
      );

      // 2) TicketSeat reserved -> cancelled
      await TicketSeat.updateMany(
        { seat: { $in: seatIds }, status: "reserved" },
        { $set: { status: "cancelled" } }
      );

      return res.json({ message: "Released holding seats" });

    } catch (err) {
      console.error("releaseHoldingSeats error:", err);
      res.status(500).json({ message: "Release failed" });
    }
  };


/* ======================================================
   FIND TICKET BY QR (qr_data)
====================================================== */
exports.findByQR = async (req, res) => {
  try {
    const qr = req.params.qr;

    const ticket = await Ticket.findOne({ qr_data: qr })
      .populate("user", "full_name email membership_card")
      .populate("showtime")
      .populate("cinema")
      .populate("room")
      .lean();

    if (!ticket)
      return res.status(404).json({ message: "Ticket not found" });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Find QR error", error: err.message });
  }
};

exports.detailFull = async (req, res) => {
  try {
    const ticketId = req.params.id;

    // 1) Lấy ticket populate đầy đủ
    const t = await Ticket.findById(ticketId)
      .populate({
        path: "showtime",
        populate: [
          { path: "movie" },
          { path: "cinema" },
          { path: "room" }
        ]
      })
      .populate("user", "full_name email")
      .lean();

    if (!t)
      return res.status(404).json({ message: "Ticket not found" });

    // 2) Lấy ghế
    const seats = await TicketSeat.find({ ticket: ticketId })
      .populate("seat")
      .lean();

    // 3) Lấy combos
    const combos = await TicketCombo.find({ ticket: ticketId })
      .populate("product")
      .lean();

    // 4) Chuẩn hoá output
    const result = {
      _id: t._id,
      reservation_code: t.reservation_code,
      status: t.status,
      payment_method: t.payment_method,
      payment_status: t.payment_status,
      total_after: t.total_after,

      showtime: {
        _id: t.showtime._id,
        start_time: t.showtime.start_time,
        movie: {
          title: t.showtime.movie.title,
          poster: t.showtime.movie.poster,
          duration: t.showtime.movie.duration
        },
        cinema: {
          name: t.showtime.cinema.name
        },
        room: {
          name: t.showtime.room.name
        }
      },

      seats: seats.map(s => ({
        row: s.row,
        number: s.number,
        seat_type: s.seat_type,
        price_final: s.price_final
      })),

      combos: combos.map(c => ({
        name: c.product.name,
        qty: c.qty,
        line_total: c.line_total
      })),

      user: t.user
    };

    res.json(result);

  } catch (err) {
    console.error("detailFull error:", err);
    res.status(500).json({ message: "Detail error" });
  }
};
