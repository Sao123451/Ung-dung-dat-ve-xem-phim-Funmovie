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

    // Cập nhật trạng thái vé
    t.status = "cancelled";
    t.payment_status = "failed";
    await t.save();

    // Huỷ TicketSeat
    await TicketSeat.updateMany(
      { ticket: id },
      { $set: { status: 'cancelled' } }
    );

    // Mở lại ShowtimeSeat
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
   CUSTOMER — TẠO VÉ (nếu không dùng bookingController)
====================================================== */
exports.create = async (req, res) => {
  res.status(400).json({
    message: "Ticket creation must be done via /api/bookings"
  });
};
