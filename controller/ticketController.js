// controller/ticketController.js
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Showtime = require('../models/Showtime');
const Seat = require('../models/Seat');

let generateQRDataURL = null;
let generateQRFile = null;
try {
  // tuỳ bạn utils/qr.js trả hàm gì; dùng cái nào có
  ({ generateQRDataURL, generateQRFile } = require('../utils/qr'));
} catch (_) { /* fallback khi chưa có utils/qr */ }

const isId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || '').trim());

// =================== CUSTOMER ===================

// GET /api/tickets/my?status=&page=1&limit=20
exports.myTickets = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      Ticket.find(filter)
        .populate('showtime')
        .populate('seats.seat')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Ticket.countDocuments(filter),
    ]);

    res.json({ items, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
};

// GET /api/tickets/:id (chỉ chủ vé hoặc admin/staff)
exports.detail = async (req, res, next) => {
  try {
    const id = String(req.params.id).trim();
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });

    const t = await Ticket.findById(id)
      .populate('user', 'username email')
      .populate('showtime')
      .populate('seats.seat');
    if (!t) return res.status(404).json({ message: 'Not found' });

    const role = req.user?.role;
    const isOwner = String(t.user?._id) === String(req.user?._id);
    if (!isOwner && !['admin', 'manager', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(t);
  } catch (err) { next(err); }
};

// POST /api/tickets  (customer tự đặt đơn giản; booking phức tạp nên để bookingController)
exports.create = async (req, res, next) => {
  try {
    const { showtime, seats, voucher, total_amount } = req.body;

    if (!isId(showtime)) return res.status(400).json({ message: 'showtime is required' });
    if (!Array.isArray(seats) || seats.length === 0)
      return res.status(400).json({ message: 'seats[] is required' });

    const st = await Showtime.findById(showtime).lean();
    if (!st) return res.status(404).json({ message: 'Showtime not found' });

    // validate seats tồn tại
    const seatIds = seats.map(s => (s?.seat));
    if (!seatIds.every(isId)) return res.status(400).json({ message: 'Invalid seat id in seats[]' });
    const count = await Seat.countDocuments({ _id: { $in: seatIds } });
    if (count !== seatIds.length) return res.status(400).json({ message: 'Some seats not found' });

    // tạo vé
    const ticket = await Ticket.create({
      user: req.user._id,
      showtime,
      seats: seats.map(s => ({ seat: s.seat, label: s.label || '' })),
      voucher: voucher && isId(voucher) ? voucher : null,
      total_amount: Number.isFinite(+total_amount) ? +total_amount : 0,
      status: 'booked'
    });

    // QR: ưu tiên ghi file, nếu không có util thì dataURL, nếu vẫn không có thì string fallback
    let qr = '';
    try {
      if (generateQRFile) {
        // generateQRFile(content, relativeDir?) -> trả về đường dẫn public, ví dụ "/public/qr/<file>.png"
        qr = await generateQRFile(`TICKET:${ticket._id}`, 'qr');
      } else if (generateQRDataURL) {
        qr = await generateQRDataURL(`TICKET:${ticket._id}`);
      } else {
        qr = `TICKET:${ticket._id}`;
      }
    } catch (_) {
      qr = `TICKET:${ticket._id}`;
    }
    ticket.qr_code = qr;
    await ticket.save();

    res.status(201).json(ticket);
  } catch (err) { next(err); }
};

// PATCH /api/tickets/:id/cancel (customer chỉ được huỷ vé của chính mình nếu đang 'booked')
exports.cancelMy = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });

    const t = await Ticket.findById(id);
    if (!t) return res.status(404).json({ message: 'Not found' });
    if (String(t.user) !== String(req.user._id)) return res.status(403).json({ message: 'Forbidden' });
    if (t.status !== 'booked') return res.status(400).json({ message: 'Only booked ticket can be cancelled' });

    t.status = 'cancelled';
    await t.save();
    res.json(t);
  } catch (err) { next(err); }
};

// =================== ADMIN / STAFF ===================

// GET /api/tickets (q: user, showtime, status, date range)
exports.list = async (req, res, next) => {
  try {
    const { user, showtime, status, from, to, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (user && isId(user)) filter.user = user;
    if (showtime && isId(showtime)) filter.showtime = showtime;
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      Ticket.find(filter)
        .populate('user', 'username email')
        .populate('showtime')
        .populate('seats.seat')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Ticket.countDocuments(filter),
    ]);

    res.json({ items, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
};

// PATCH /api/tickets/:id/status  body: { status: 'booked'|'cancelled'|'used' }
exports.updateStatus = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    const { status } = req.body;
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });
    if (!['booked', 'cancelled', 'used'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const t = await Ticket.findById(id);
    if (!t) return res.status(404).json({ message: 'Not found' });
    t.status = status;
    await t.save();
    res.json(t);
  } catch (err) { next(err); }
};

// DELETE /api/tickets/:id
exports.remove = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });
    const del = await Ticket.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// GET /api/tickets/:id/qr
exports.getQR = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });
    const t = await Ticket.findById(id).select('qr_code user');
    if (!t) return res.status(404).json({ message: 'Not found' });

    // chỉ chủ vé hoặc admin/staff mới xem QR
    const role = req.user?.role;
    const isOwner = String(t.user) === String(req.user?._id);
    if (!isOwner && !['admin', 'manager', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json({ qr_code: t.qr_code || '' });
  } catch (err) { next(err); }
};
