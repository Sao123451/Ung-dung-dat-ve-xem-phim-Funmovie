// controller/seatController.js
const mongoose = require('mongoose');
const Seat = require('../models/Seat');
const Room = require('../models/Room');

const isId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || '').trim());

// ---- helper: sync flags from seat_status ----
function deriveFlags(status) {
  // status: available | sold | broken
  if (status === 'sold')    return { is_booked: true,  active: true };
  if (status === 'broken')  return { is_booked: false, active: false };
  return { is_booked: false, active: true }; // available
}

// ===== PUBLIC (Android) =====
// GET /api/seats/public?room=<roomId>&mode=grid|list
exports.publicByRoom = async (req, res, next) => {
  try {
    const { room, mode = 'list' } = req.query;
    if (!isId(room)) return res.status(400).json({ message: 'Invalid room id' });

    const seats = await Seat.find({ room })
      .select('_id row number seat_type extra_price is_booked active seat_status')
      .sort({ row: 1, number: 1 })
      .lean();

    if (mode === 'grid') {
      const map = new Map();
      for (const s of seats) {
        if (!map.has(s.row)) map.set(s.row, []);
        map.get(s.row).push({
          _id: s._id,
          number: s.number,
          seat_type: s.seat_type,
          extra_price: s.extra_price,
          is_booked: s.is_booked,
          active: s.active,
          seat_status: s.seat_status || 'available',
        });
      }
      const grid = [...map.entries()].map(([row, arr]) => ({ row, seats: arr }));
      return res.json(grid);
    }

    res.json(seats);
  } catch (err) { next(err); }
};

// GET /api/seats/:id/public
exports.publicDetail = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });
    const seat = await Seat.findById(id).select('-__v').lean();
    if (!seat) return res.status(404).json({ message: 'Not found' });
    res.json(seat);
  } catch (err) { next(err); }
};

// ===== ADMIN / MANAGER =====
// GET /api/seats?room=<roomId>&row=A&type=vip&booked=true&active=true&status=sold&page=1&limit=100
exports.list = async (req, res, next) => {
  try {
    const { room, row, type, booked, active, status, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (room) {
      if (!isId(room)) return res.status(400).json({ message: 'Invalid room id' });
      filter.room = room;
    }
    if (row) filter.row = row;
    if (type) filter.seat_type = type;
    if (typeof booked !== 'undefined') filter.is_booked = booked === 'true';
    if (typeof active !== 'undefined') filter.active = active === 'true';
    if (status && ['available','sold','broken'].includes(status)) filter.seat_status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      Seat.find(filter)
        .select('_id room row number seat_type extra_price is_booked active seat_status createdAt updatedAt')
        .sort({ row: 1, number: 1 })
        .skip(skip).limit(parseInt(limit, 10)),
      Seat.countDocuments(filter),
    ]);
    res.json({ items, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) { next(err); }
};

// POST /api/seats
// body: { room, row, number, seat_type?, extra_price?, seat_status?, is_booked?, active? }
exports.create = async (req, res, next) => {
  try {
    const { room, row, number, seat_type, extra_price, seat_status, is_booked, active } = req.body;
    if (!room || !isId(room)) return res.status(400).json({ message: 'room is required & must be ObjectId' });
    if (!row) return res.status(400).json({ message: 'row is required' });
    if (typeof number === 'undefined') return res.status(400).json({ message: 'number is required' });

    const roomDoc = await Room.findById(room).lean();
    if (!roomDoc) return res.status(404).json({ message: 'Room not found' });

    let flags = {};
    if (seat_status && ['available','sold','broken'].includes(seat_status)) {
      flags = deriveFlags(seat_status);
    } else {
      if (typeof is_booked !== 'undefined') flags.is_booked = !!is_booked;
      if (typeof active !== 'undefined')    flags.active    = !!active;
    }

    const doc = await Seat.create({
      room,
      row: String(row).trim(),
      number: +number,
      seat_type: seat_type || 'normal',
      extra_price: Number.isFinite(+extra_price) ? +extra_price : 0,
      seat_status: seat_status || 'available',
      is_booked: typeof flags.is_booked === 'boolean' ? flags.is_booked : false,
      active:    typeof flags.active    === 'boolean' ? flags.active    : true,
    });

    res.status(201).json(doc);
  } catch (err) {
    if (err?.code === 11000) return res.status(400).json({ message: 'Duplicate seat (room,row,number) already exists' });
    next(err);
  }
};

// POST /api/seats/bulk
// body: { room, rows: [ { row:"A", from:1, to:10, seat_type?, extra_price?, seat_status? }, ... ] }
exports.bulkCreate = async (req, res, next) => {
  try {
    const { room, rows } = req.body;
    if (!room || !isId(room)) return res.status(400).json({ message: 'room is required & must be ObjectId' });
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: 'rows array required' });

    const roomDoc = await Room.findById(room).lean();
    if (!roomDoc) return res.status(404).json({ message: 'Room not found' });

    const docs = [];
    for (const r of rows) {
      const rowName = String(r.row || '').trim();
      const from = +r.from, to = +r.to;
      if (!rowName || !Number.isFinite(from) || !Number.isFinite(to) || from > to) {
        return res.status(400).json({ message: `Invalid row spec: ${JSON.stringify(r)}` });
      }
      for (let n = from; n <= to; n++) {
        const status = r.seat_status && ['available','sold','broken'].includes(r.seat_status)
          ? r.seat_status : 'available';
        const flags = deriveFlags(status);

        docs.push({
          room,
          row: rowName,
          number: n,
          seat_type: r.seat_type || 'normal',
          extra_price: Number.isFinite(+r.extra_price) ? +r.extra_price : 0,
          seat_status: status,
          is_booked: flags.is_booked,
          active: flags.active,
        });
      }
    }

    const created = await Seat.insertMany(docs, { ordered: false }); // skip duplicates
    res.status(201).json({ inserted: created.length });
  } catch (err) {
    if (err?.name === 'BulkWriteError') {
      const inserted = err.result?.nInserted ?? 0;
      return res.status(201).json({ inserted, warning: 'Some duplicates were skipped' });
    }
    next(err);
  }
};

// PUT /api/seats/:id  (cập nhật fields cơ bản + sync status/flags)
exports.update = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });

    const seat = await Seat.findById(id);
    if (!seat) return res.status(404).json({ message: 'Not found' });

    const { room, row, number, seat_type, extra_price, seat_status, is_booked, active } = req.body;

    if (typeof room !== 'undefined') {
      if (!isId(room)) return res.status(400).json({ message: 'Invalid room id' });
      const r = await Room.findById(room).lean();
      if (!r) return res.status(404).json({ message: 'Room not found' });
      seat.room = room;
    }
    if (typeof row !== 'undefined')        seat.row = String(row).trim();
    if (typeof number !== 'undefined')     seat.number = +number;
    if (typeof seat_type !== 'undefined')  seat.seat_type = seat_type;
    if (typeof extra_price !== 'undefined')seat.extra_price = Number.isFinite(+extra_price) ? +extra_price : seat.extra_price;

    if (typeof seat_status !== 'undefined') {
      if (!['available','sold','broken'].includes(seat_status)) {
        return res.status(400).json({ message: 'seat_status must be available|sold|broken' });
      }
      seat.seat_status = seat_status;
      const flags = deriveFlags(seat_status);
      seat.is_booked = flags.is_booked;
      seat.active    = flags.active;
    } else {
      // cho phép update trực tiếp flags nếu không gửi seat_status
      if (typeof is_booked !== 'undefined') seat.is_booked = !!is_booked;
      if (typeof active    !== 'undefined') seat.active    = !!active;
    }

    await seat.save();
    res.json(seat);
  } catch (err) {
    if (err?.code === 11000) return res.status(400).json({ message: 'Duplicate seat (room,row,number) already exists' });
    next(err);
  }
};

// PATCH /api/seats/:id/status
// body: { seat_status?: 'available'|'sold'|'broken', is_booked?: boolean, active?: boolean }
exports.updateStatus = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });

    const payload = {};
    if (typeof req.body.seat_status !== 'undefined') {
      const status = String(req.body.seat_status);
      if (!['available','sold','broken'].includes(status)) {
        return res.status(400).json({ message: 'seat_status must be available|sold|broken' });
      }
      const flags = deriveFlags(status);
      payload.seat_status = status;
      payload.is_booked = flags.is_booked;
      payload.active = flags.active;
    } else {
      if (typeof req.body.is_booked !== 'undefined') payload.is_booked = !!req.body.is_booked;
      if (typeof req.body.active    !== 'undefined') payload.active    = !!req.body.active;
    }

    const seat = await Seat.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true });
    if (!seat) return res.status(404).json({ message: 'Not found' });
    res.json(seat);
  } catch (err) { next(err); }
};

// DELETE /api/seats/:id
exports.remove = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });
    const del = await Seat.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// DELETE /api/seats/clear?room=<roomId>
exports.clearByRoom = async (req, res, next) => {
  try {
    const { room } = req.query;
    if (!isId(room)) return res.status(400).json({ message: 'Invalid room id' });
    const result = await Seat.deleteMany({ room });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (err) { next(err); }
};
