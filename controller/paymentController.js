// ======================= IMPORT =========================
const Payment = require('../models/Payment');
const Ticket  = require('../models/Ticket');
const TicketSeat = require('../models/TicketSeat');
const Seat    = require('../models/Seat');
const Voucher = require('../models/Voucher');

const isId = v => /^[0-9a-fA-F]{24}$/.test(String(v||'').trim());


// =========================================================
// CONFIRM TICKET ATOMIC – AUTO WHEN PAYMENT SUCCEEDED
// =========================================================
async function confirmTicketAtomic(ticketId) {
  const t = await Ticket.findById(ticketId);
  if (!t || t.status !== 'pending') return t;

  // ==============================================
  // 1) TicketSeat: reserved -> sold (remove TTL)
  // ==============================================
  await TicketSeat.updateMany(
    { ticket: t._id, status: 'reserved' },
    { $set: { status: 'sold' }, $unset: { expires_at: 1 } }
  );

  // ==============================================
  // 2) Seat thực -> sold
  // ==============================================
  const seatDocs = await TicketSeat.find({ ticket: t._id }).select('seat').lean();
  const seatIds = seatDocs.map(s => s.seat);

  if (seatIds.length) {
    await Seat.updateMany(
      { _id: { $in: seatIds } },
      { $set: { seat_status: 'sold' } }
    );
  }

  // ==============================================
  // 3) Cập nhật ticket
  // ==============================================
  t.status = 'paid';
  t.payment_status = 'paid';
  t.payment_time = new Date();   // ⭐ QUAN TRỌNG: SET PAYMENT TIME

  await t.save();

  // ==============================================
  // 4) Voucher usage
  // ==============================================
  if (t.voucher_codes?.length) {
    await Voucher.updateMany(
      { code: { $in: t.voucher_codes } },
      { $inc: { used_count: 1 } }
    );
  }

  return t;
}


// =========================================================
// POST /api/payments/init  (customer → tạo payment)
// =========================================================
exports.init = async (req, res, next) => {
  try {
    const { ticketId, method = "cash" } = req.body || {};

    if (!isId(ticketId))
      return res.status(400).json({ message: "Invalid ticketId" });

    const t = await Ticket.findById(ticketId);
    if (!t)
      return res.status(404).json({ message: "Ticket not found" });

    if (t.status !== "pending")
      return res.status(400).json({ message: "Ticket is not pending" });

    const m = String(method).toLowerCase();

    // Tạo payment log
    const pay = await Payment.create({
      ticket: t._id,
      user: t.user,
      method: m,
      amount: t.total_after,
      status: m === "cash" ? "succeeded" : "pending",
      meta: { createdBy: "api" }
    });

    // =========================================================
    // CASH → Auto confirm ticket
    // =========================================================
    if (m === "cash") {
      const t2 = await confirmTicketAtomic(t._id);

      // Gán payment info vào ticket
      t2.payment_method = "cash";
      t2.payment_id = pay._id;
      t2.payment_time = new Date();   // ⭐ BẮT BUỘC CÓ
      await t2.save();

      return res.status(201).json({
        message: "Payment created & ticket confirmed (cash)",
        payment: pay
      });
    }

    // =========================================================
    // ONLINE → trả deeplink mock để test app/web
    // =========================================================
    const mock = {
      deeplink: `funmovie://${m}/pay?paymentId=${pay._id}`,
      redirect_url: `/payments/${pay._id}/simulate/${m}`
    };

    return res.status(201).json({
      message: "Payment created",
      payment: pay,
      next: mock
    });

  } catch (err) {
    next(err);
  }
};



// =========================================================
// POST /api/payments/:id/mark  (webhook / staff confirm)
// =========================================================
exports.mark = async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!isId(id))
      return res.status(400).json({ message: "Invalid id" });

    const { status, provider_txn_id, provider_message, meta } = req.body || {};

    if (!["succeeded", "failed", "refunded", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Cập nhật Payment
    const p = await Payment.findByIdAndUpdate(
      id,
      { $set: { status, provider_txn_id, provider_message, meta } },
      { new: true }
    ).populate("ticket");

    if (!p)
      return res.status(404).json({ message: "Payment not found" });

    // =========================================================
    // NẾU Succeeded → Auto confirm ticket
    // =========================================================
    if (p.status === "succeeded" && p.ticket && p.ticket.status === "pending") {
      const t = await confirmTicketAtomic(p.ticket._id);

      t.payment_method = p.method;
      t.payment_id = p._id;
      t.payment_time = new Date();   // ⭐ CỰC QUAN TRỌNG
      await t.save();
    }

    res.json({
      message: "Payment updated",
      payment: p
    });

  } catch (err) {
    next(err);
  }
};
