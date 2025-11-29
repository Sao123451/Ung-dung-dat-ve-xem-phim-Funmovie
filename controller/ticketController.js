// controller/ticketController.js
const Ticket = require('../models/Ticket');
const TicketSeat = require('../models/TicketSeat');
const ShowtimeSeat = require('../models/ShowtimeSeat');
const Showtime = require('../models/Showtime');

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

    // ⭐ AUDIT LOG — khách tự hủy vé
    req.auditAction  = 'ticket.cancel_my';
    req.auditSummary = `Khách hàng tự hủy vé ${t._id} (mã ${t.reservation_code || ''}) — trạng thái: ${oldStatus} → cancelled`;
    req.auditTarget  = {
      type: 'Ticket',
      id:   t._id,
      name: t.reservation_code || t._id.toString(),
    };

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

    // ⭐ AUDIT LOG — admin/staff đổi trạng thái vé
    req.auditAction  = 'ticket.update_status';
    req.auditSummary = `Cập nhật trạng thái vé ${t._id} (mã ${t.reservation_code || ''}): ${oldStatus} → ${status}`;
    req.auditTarget  = {
      type: 'Ticket',
      id:   t._id,
      name: t.reservation_code || t._id.toString(),
    };

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

     // ⭐ AUDIT LOG — xóa vé
    req.auditAction  = 'ticket.delete';
    req.auditSummary = `Xóa vé ${t._id} (mã ${t.reservation_code || ''})`;
    req.auditTarget  = {
      type: 'Ticket',
      id:   t._id,
      name: t.reservation_code || t._id.toString(),
    };

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
