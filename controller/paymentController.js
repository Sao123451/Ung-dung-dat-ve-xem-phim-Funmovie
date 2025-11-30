// controller/paymentController.js

// ======================= IMPORTS =========================
const Ticket = require("../models/Ticket");
const TicketSeat = require("../models/TicketSeat");
const Seat = require("../models/Seat");
const Voucher = require("../models/Voucher");
const Payment = require("../models/Payment");
const TicketCombo = require("../models/TicketCombo");
const ShowtimeSeat = require("../models/ShowtimeSeat");
const Showtime = require("../models/Showtime");
const path = require("path");

const vnpayService = require("../services/vnpayService");
const sendTicketEmail = require("../services/email.service");

// Kiểm tra ObjectId
const isId = v => /^[0-9a-fA-F]{24}$/.test(String(v || "").trim());


// =========================================================
// CONFIRM TICKET ATOMIC
// =========================================================
async function confirmTicketAtomic(ticketId) {
  // 1) Lấy ticket + user
  const t = await Ticket.findById(ticketId).populate("user");
  if (!t || t.status !== "pending") return t;

  // 2) TicketSeat → SOLD
  const ticketSeats = await TicketSeat.find({ ticket: t._id });

  await TicketSeat.updateMany(
    { ticket: t._id, status: "reserved" },
    {
      $set: { status: "sold" },
      $unset: { expires_at: 1 }   
    }
  );

  // 3) ShowtimeSeat → SOLD (CHUẨN)
  for (const s of ticketSeats) {
    await ShowtimeSeat.updateOne(
      { showtime: t.showtime, row: s.row, number: s.number },
      {
        $set: { status: "sold" },
        $unset: { expires_at: 1 }   
      }
    );
  }

  // 4) Cập nhật Ticket
  t.status = "paid";
  t.payment_status = "paid";
  t.payment_method = "vnpay";   
  t.payment_time = new Date();
  t.qr_data = `${t.reservation_code}|${t._id}`;
  await t.save();

  // 5) Voucher update
  if (t.voucher_codes?.length) {
    await Voucher.updateMany(
      { code: { $in: t.voucher_codes } },
      { $inc: { used_count: 1 } }
    );
  }

  // 6) Lấy showtime + populate
  const showtime = await Showtime.findById(t.showtime)
    .populate("movie cinema room")
    .lean();

  // 7) GHẾ MỚI NHẤT (CHUẨN)
  const seats = await TicketSeat.find({ ticket: t._id })
    .select("row number seat_type price_final status")
    .lean();

  // 8) Combo
  const combos = await TicketCombo.find({ ticket: t._id }).lean();

  // 9) Gửi email
  if (t.user?.email) {
    try {
      await sendTicketEmail(t.user.email, t, showtime, seats, combos);
    } catch (err) {
      console.error("❌ Send email failed", err);
    }
  } else {
    console.error("❌ Ticket has NO user email:", t._id);
  }

  return t;
}




// =========================================================
// INIT PAYMENT (cash/testpay)
// =========================================================
exports.init = async (req, res, next) => {
  try {
    const { ticketId, method = "cash" } = req.body;

    if (!isId(ticketId))
      return res.status(400).json({ message: "Invalid ticketId" });

    const t = await Ticket.findById(ticketId);
    if (!t) return res.status(404).json({ message: "Ticket not found" });

    if (t.status !== "pending")
      return res.status(400).json({ message: "Ticket is not pending" });

    const m = String(method).toLowerCase();

    // Payment log
    const p = await Payment.create({
      ticket: t._id,
      user: t.user,
      method: m,
      amount: t.total_after,
      status: m === "cash" ? "succeeded" : "pending"
    });

    // CASH → auto confirm
    if (m === "cash") {
      const t2 = await confirmTicketAtomic(t._id);
      t2.payment_id = p._id;
      t2.payment_method = "cash";
      await t2.save();

      return res.json({
        message: "Payment created & ticket confirmed (cash)",
        payment: p
      });
    }

    return res.json({
      message: "Payment created",
      payment: p
    });

  } catch (err) {
    next(err);
  }
};



// =========================================================
// WEBHOOK / STAFF CONFIRM
// =========================================================
exports.mark = async (req, res, next) => {
  try {
    const id = req.params.id;

    const { status, provider_txn_id, provider_message } = req.body;

    const p = await Payment.findByIdAndUpdate(
      id,
      { status, provider_txn_id, provider_message },
      { new: true }
    ).populate("ticket");

    if (!p) return res.status(404).json({ message: "Payment not found" });

    // Succeeded → confirm ticket
    if (p.status === "succeeded" && p.ticket.status === "pending") {
      const t = await confirmTicketAtomic(p.ticket._id);
      t.payment_method = p.method;
      t.payment_id = p._id;
      await t.save();
    }

    res.json({ message: "Payment updated", payment: p });

  } catch (err) {
    next(err);
  }
};




// =========================================================
// VNPAY INIT
// =========================================================
exports.initVnpay = async (req, res, next) => {
  try {
    const { ticketId } = req.body;

    const t = await Ticket.findById(ticketId);
    if (!t) return res.status(404).json({ message: "Ticket not found" });

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    console.log("Reservation code RAW =", t.reservation_code);
    console.log("Reservation code JSON =", JSON.stringify(t.reservation_code));
    console.log("Reservation code bytes =", Buffer.from(t.reservation_code));

    let amount = Number(t.total_after);
    if (!amount || isNaN(amount)) {
      console.error("❌ Invalid amount:", t.total_after);
      return res.status(400).json({ message: "Invalid amount" });
    }

    const url = vnpayService.createPaymentUrl(
      t.reservation_code,
      amount,
      ip
    );

    return res.json({
      payment_url: url
    });

  } catch (err) {
    next(err);
  }
};





// =========================================================
// VNPAY RETURN
// =========================================================
exports.vnpayReturn = async (req, res) => {
  const params = { ...req.query };

  if (!vnpayService.verifyChecksum(params))
    return res.json({ RspCode: "97", Message: "Invalid Checksum" });

  // gửi file HTML (để js external xử lý)
  res.sendFile(path.join(__dirname, "../public/vnpay/return.html"));
};



// =========================================================
// VNPAY IPN (SERVER CALLBACK)
// =========================================================
exports.vnpayIpn = async (req, res) => {
  const params = { ...req.query };
  console.log("🔥 IPN:", params);

  if (!vnpayService.verifyChecksum(params))
    return res.json({ RspCode: "97", Message: "Invalid Checksum" });

  const code = params["vnp_TxnRef"];
  const rsp = params["vnp_ResponseCode"];

  const ticket = await Ticket.findOne({ reservation_code: code });
  if (!ticket)
    return res.json({ RspCode: "01", Message: "Ticket Not Found" });

  // ===============================
  // THANH TOÁN THÀNH CÔNG
  // ===============================
  if (rsp === "00") {
    const t = await confirmTicketAtomic(ticket._id);

    t.payment_method = "vnpay";
    t.payment_id = params["vnp_TransactionNo"];
    t.payment_status = "paid";
    await t.save();

    return res.json({ RspCode: "00", Message: "Paid" });
  }

  // ===============================
  // THANH TOÁN THẤT BẠI → HUỶ VÉ
  // ===============================
  await Ticket.updateOne(
    { _id: ticket._id },
    { status: "cancelled", payment_status: "failed" }
  );

  await TicketSeat.updateMany(
    { ticket: ticket._id },
    { status: "cancelled" }
  );

  await ShowtimeSeat.updateMany(
    { showtime: ticket.showtime, status: "holding" },
    { status: "available" }
  );

  return res.json({ RspCode: "00", Message: "Cancelled" });
};
// =========================================================
// ⭐ STAFF INIT VNPAY (TÁCH RIÊNG — KHÔNG ẢNH HƯỞNG ANDROID)
// =========================================================
exports.staffInitVnpay = async (req, res, next) => {
  try {
    const { ticketId, returnUrl } = req.body;

    if (!ticketId)
      return res.status(400).json({ message: "ticketId required" });

    const t = await Ticket.findById(ticketId);
    if (!t) return res.status(404).json({ message: "Ticket not found" });

    if (t.status !== "pending")
      return res.status(400).json({ message: "Ticket not pending" });

    let amount = Number(t.total_after);
    if (!amount || isNaN(amount)) {
      console.error("❌ Invalid amount:", t.total_after);
      return res.status(400).json({ message: "Invalid amount" });
    }

    // ⭐ STAFF SẼ BẮT BUỘC TRUYỀN returnUrl
    if (!returnUrl)
      return res.status(400).json({ message: "returnUrl required for staff" });

    const ip =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const url = vnpayService.createPaymentUrl(
      t.reservation_code,
      amount,
      ip,
      returnUrl    // ⭐ KHÁC ANDROID — STAFF DÙNG RETURN.HTML
    );

    return res.json({ payment_url: url });

  } catch (err) {
    next(err);
  }
};
