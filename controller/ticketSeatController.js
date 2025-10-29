// controller/ticketSeatController.js
const mongoose = require('mongoose');
const TicketSeat = require('../models/TicketSeat');
const Ticket = require('../models/Ticket');

const isId = v => /^[0-9a-fA-F]{24}$/.test(String(v||'').trim());

/** CUSTOMER/ADMIN: lấy ghế của 1 ticket
 * GET /api/ticket-seats/by-ticket/:ticketId
 * - Chỉ chủ vé hoặc admin/manager/staff mới xem
 */
exports.byTicket = async (req, res, next) => {
  try {
    const ticketId = String(req.params.ticketId || '').trim();
    if (!/^[0-9a-fA-F]{24}$/.test(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket id' });
    }

    const items = await TicketSeat.find({ ticket: ticketId })
      .populate('seat')
      .sort({ createdAt: 1 });
    res.json(items);
  } catch (err) { next(err); }
};


/** ADMIN: liệt kê + lọc + phân trang
 * GET /api/ticket-seats?ticket=&seat=&status=&page=&limit=
 */
exports.list = async (req, res, next) => {
  try {
    const { ticket, seat, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (ticket && isId(ticket)) filter.ticket = ticket;
    if (seat && isId(seat)) filter.seat = seat;
    if (status) filter.status = status;

    const skip = (parseInt(page,10)-1) * parseInt(limit,10);
    const [items, total] = await Promise.all([
      TicketSeat.find(filter)
        .populate('ticket')
        .populate('seat')
        .sort({ createdAt: -1 })
        .skip(skip).limit(parseInt(limit,10)),
      TicketSeat.countDocuments(filter)
    ]);

    res.json({ items, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
};

/** ADMIN/CUSTOMER (chủ vé): tạo hàng loạt ghế cho 1 ticket
 * POST /api/ticket-seats/bulk
 * body: { ticket: "<id>", items: [ {seat:"<id>", label:"A-1", price:90000}, ... ] }
 */
exports.bulkCreate = async (req, res, next) => {
  try {
    const { ticket, items } = req.body;
    if (!isId(ticket)) return res.status(400).json({ message: 'ticket is required' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items[] is required' });
    }

    const t = await Ticket.findById(ticket).select('user').lean();
    if (!t) return res.status(404).json({ message: 'Ticket not found' });

    // chỉ chủ vé hoặc admin/manager/staff
    const role = req.user?.role;
    const isOwner = String(t.user) === String(req.user?._id);
    if (!isOwner && !['admin','manager','staff'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const docs = [];
    for (const it of items) {
      if (!isId(it.seat)) {
        return res.status(400).json({ message: `Invalid seat id: ${it.seat}` });
      }
      docs.push({
        ticket,
        seat: it.seat,
        label: String(it.label || ''),
        price: Number.isFinite(+it.price) ? +it.price : 0,
        status: 'booked'
      });
    }

    const created = await TicketSeat.insertMany(docs, { ordered: false });
    res.status(201).json({ inserted: created.length });
  } catch (err) {
    // Duplicate (unique ticket+seat)
    if (err?.name === 'BulkWriteError' || err?.code === 11000) {
      const inserted = err.result?.nInserted ?? 0;
      return res.status(201).json({ inserted, warning: 'Some duplicates were skipped' });
    }
    next(err);
  }
};

/** ADMIN/STAFF: đổi trạng thái 1 bản ghi
 * PATCH /api/ticket-seats/:id/status  { status: 'booked'|'cancelled'|'used' }
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const id = String(req.params.id||'').trim();
    const { status } = req.body;
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });
    if (!['booked','cancelled','used'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const doc = await TicketSeat.findByIdAndUpdate(id, { status }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) { next(err); }
};

/** ADMIN/OWNER: xoá 1 ghế trong ticket
 * DELETE /api/ticket-seats/:id
 */
exports.remove = async (req, res, next) => {
  try {
    const id = String(req.params.id||'').trim();
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });

    const ts = await TicketSeat.findById(id).populate('ticket', 'user');
    if (!ts) return res.status(404).json({ message: 'Not found' });

    const role = req.user?.role;
    const isOwner = String(ts.ticket.user) === String(req.user?._id);
    if (!isOwner && !['admin','manager','staff'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await TicketSeat.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (err) { next(err); }
};
