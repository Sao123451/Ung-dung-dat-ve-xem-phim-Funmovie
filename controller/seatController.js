// controller/seatController.js
const mongoose = require('mongoose');
const Seat = require('../models/Seat');
const Room = require('../models/Room');

const isId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || '').trim());

// ===== PUBLIC =====
// GET /api/seats/public?room=<roomId>&mode=grid|list
exports.publicByRoom = async (req, res, next) => {
  try {
    const { room, mode = 'list' } = req.query;
    if (!isId(room)) return res.status(400).json({ message: 'Invalid room id' });

    const seats = await Seat.find({ room })
      .select('_id row number seat_type extra_price seat_status')
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
          // [CHANGE] giờ seat_status có thể là available|holding|sold|broken
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
// GET /api/seats?room=<roomId>&row=A&type=vip&status=sold&page=1&limit=100
exports.list = async (req, res, next) => {
  try {
    const { room, row, type, status, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (room) {
      if (!isId(room)) return res.status(400).json({ message: 'Invalid room id' });
      filter.room = room;
    }
    if (row) filter.row = row;
    if (type) filter.seat_type = type;
    // [CHANGE] thêm 'holding'
    if (status && ['available','holding','sold','broken'].includes(status)) {
      filter.seat_status = status;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      Seat.find(filter)
        .select('_id room row number seat_type extra_price seat_status createdAt updatedAt')
        .sort({ row: 1, number: 1 })
        .skip(skip).limit(parseInt(limit, 10)),
      Seat.countDocuments(filter),
    ]);
    res.json({ items, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) { next(err); }
};

// POST /api/seats  (bị chặn nếu enforce_layout=true)
exports.create = async (req, res, next) => {
  try {
    const { room, row, number, seat_type, extra_price, seat_status } = req.body;
    if (!room || !isId(room)) return res.status(400).json({ message: 'room is required & must be ObjectId' });
    if (!row) return res.status(400).json({ message: 'row is required' });
    if (typeof number === 'undefined') return res.status(400).json({ message: 'number is required' });

    const roomDoc = await Room.findById(room).lean();
    if (!roomDoc) return res.status(404).json({ message: 'Room not found' });
    if (roomDoc.enforce_layout) {
      return res.status(400).json({ message: 'Room seats are locked by preset (enforce_layout=true). Use /rooms/:id/regenerate-seats instead.' });
    }

    // [CHANGE] validate thêm holding
    if (typeof seat_status !== 'undefined' &&
        !['available','holding','sold','broken'].includes(seat_status)) {
      return res.status(400).json({ message: 'seat_status must be available|holding|sold|broken' });
    }

    const doc = await Seat.create({
      room,
      row: String(row).trim(),
      number: +number,
      seat_type: seat_type || 'normal',
      extra_price: Number.isFinite(+extra_price) ? +extra_price : 0,
      seat_status: seat_status || 'available',
    });

    // ⭐ AUDIT: tạo 1 ghế
    req.auditAction  = 'seat.create';
    req.auditSummary = `Tạo ghế ${doc.row}${doc.number} (${doc.seat_type}, trạng thái: ${doc.seat_status}) trong phòng ${roomDoc.name}`;
    req.auditTarget  = {
      type: 'Seat',
      id:   doc._id,
      name: `${doc.row}${doc.number}`,
    };

    res.status(201).json(doc);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: 'Duplicate seat (room,row,number) already exists' });
    }
    next(err);
  }
};

// POST /api/seats/bulk  (bị chặn nếu enforce_layout=true)
exports.bulkCreate = async (req, res, next) => {
  try {
    const { room, rows } = req.body;
    if (!room || !isId(room)) return res.status(400).json({ message: 'room is required & must be ObjectId' });
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'rows array required' });
    }

    const roomDoc = await Room.findById(room).lean();
    if (!roomDoc) return res.status(404).json({ message: 'Room not found' });
    if (roomDoc.enforce_layout) {
      return res.status(400).json({ message: 'Room seats are locked by preset (enforce_layout=true). Use /rooms/:id/regenerate-seats instead.' });
    }

    const docs = [];
    for (const r of rows) {
      const rowName = String(r.row || '').trim();
      const from = +r.from, to = +r.to;
      if (!rowName || !Number.isFinite(from) || !Number.isFinite(to) || from > to) {
        return res.status(400).json({ message: `Invalid row spec: ${JSON.stringify(r)}` });
      }
      for (let n = from; n <= to; n++) {
        // [CHANGE] status cho phép holding
        const status = r.seat_status && ['available','holding','sold','broken'].includes(r.seat_status)
          ? r.seat_status
          : 'available';

        docs.push({
          room,
          row: rowName,
          number: n,
          seat_type: r.seat_type || 'normal',
          extra_price: Number.isFinite(+r.extra_price) ? +r.extra_price : 0,
          seat_status: status,
        });
      }
    }

    const created = await Seat.insertMany(docs, { ordered: false });

    // ⭐ AUDIT: tạo nhiều ghế
    req.auditAction  = 'seat.bulkCreate';
    req.auditSummary = `Tạo ${created.length} ghế thủ công trong phòng ${roomDoc.name}`;
    req.auditTarget  = {
      type: 'Room',
      id:   roomDoc._id,
      name: roomDoc.name,
    };

    res.status(201).json({ inserted: created.length });
  } catch (err) {
    if (err?.name === 'BulkWriteError') {
      const inserted = err.result?.nInserted ?? 0;

      // ⭐ AUDIT vẫn log, nhưng ghi chú có bỏ qua trùng
      req.auditAction  = 'seat.bulkCreate';
      req.auditSummary = `Tạo ${inserted} ghế (một số ghế trùng bị bỏ qua)`;
      req.auditTarget  = { type: 'Room', id: req.body.room, name: `room:${req.body.room}` };

      return res.status(201).json({ inserted, warning: 'Some duplicates were skipped' });
    }
    next(err);
  }
};

// PUT /api/seats/:id
exports.update = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });

    const seat = await Seat.findById(id);
    if (!seat) return res.status(404).json({ message: 'Not found' });

    const { room, row, number, seat_type, extra_price, seat_status } = req.body;

    if (typeof room !== 'undefined') {
      if (!isId(room)) return res.status(400).json({ message: 'Invalid room id' });
      const r = await Room.findById(room).lean();
      if (!r) return res.status(404).json({ message: 'Room not found' });
      if (r.enforce_layout) {
        return res.status(400).json({ message: 'Room seats are locked by preset (enforce_layout=true). Use /rooms/:id/regenerate-seats instead.' });
      }
      seat.room = room;
    }
    if (typeof row !== 'undefined')        seat.row = String(row).trim();
    if (typeof number !== 'undefined')     seat.number = +number;
    if (typeof seat_type !== 'undefined')  seat.seat_type = seat_type;
    if (typeof extra_price !== 'undefined') {
      seat.extra_price = Number.isFinite(+extra_price) ? +extra_price : seat.extra_price;
    }

    if (typeof seat_status !== 'undefined') {
      // [CHANGE] validate thêm holding
      if (!['available','holding','sold','broken'].includes(seat_status)) {
        return res.status(400).json({ message: 'seat_status must be available|holding|sold|broken' });
      }
      seat.seat_status = seat_status;
    }

    await seat.save();

    // ⭐ AUDIT: cập nhật ghế
    req.auditAction  = 'seat.update';
    req.auditSummary = `Cập nhật ghế ${seat.row}${seat.number} (${seat.seat_type}, trạng thái: ${seat.seat_status}) trong phòng ${seat.room?.name || seat.room}`;
    req.auditTarget  = {
      type: 'Seat',
      id:   seat._id,
      name: `${seat.row}${seat.number}`,
    };

    res.json(seat);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: 'Duplicate seat (room,row,number) already exists' });
    }
    next(err);
  }
};

// PATCH /api/seats/:id/status  { seat_status: 'available'|'holding'|'sold'|'broken' }
exports.updateStatus = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!isId(id)) return res.status(400).json({ message: 'Invalid id' });

    const status = String(req.body.seat_status || '').trim();
    // [CHANGE] thêm holding
    if (!['available','holding','sold','broken'].includes(status)) {
      return res.status(400).json({ message: 'seat_status must be available|holding|sold|broken' });
    }

    const seat = await Seat.findByIdAndUpdate(
      id,
      { $set: { seat_status: status } },
      { new: true, runValidators: true }
    );
    if (!seat) return res.status(404).json({ message: 'Not found' });

    // ⭐ AUDIT: đổi trạng thái ghế
    req.auditAction  = 'seat.updateStatus';
    req.auditSummary = `Đổi trạng thái ghế ${seat.row}${seat.number} trong phòng ${seat.room?.name || seat.room}: ${oldStatus} → ${status}`;
    req.auditTarget  = {
      type: 'Seat',
      id:   seat._id,
      name: `${seat.row}${seat.number}`,
    };

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

    // ⭐ AUDIT: xóa 1 ghế
    req.auditAction  = 'seat.delete';
    req.auditSummary = `Xóa ghế ${seat.row}${seat.number} trong phòng ${seat.room?.name || seat.room}`;
    req.auditTarget  = {
      type: 'Seat',
      id:   seat._id,
      name: `${seat.row}${seat.number}`,
    };

    res.json({ ok: true });
  } catch (err) { next(err); }
};

// DELETE /api/seats/clear?room=<roomId>  (bị chặn nếu enforce_layout=true)
exports.clearByRoom = async (req, res, next) => {
  try {
    const { room } = req.query;
    if (!isId(room)) return res.status(400).json({ message: 'Invalid room id' });
    const roomDoc = await Room.findById(room).lean();
    if (!roomDoc) return res.status(404).json({ message: 'Room not found' });
    if (roomDoc.enforce_layout) {
      return res.status(400).json({ message: 'Room seats are locked by preset (enforce_layout=true). Use /rooms/:id/regenerate-seats instead.' });
    }
    const result = await Seat.deleteMany({ room });

     // ⭐ AUDIT: xóa toàn bộ ghế trong phòng
    req.auditAction  = 'seat.clearByRoom';
    req.auditSummary = `Xóa toàn bộ ${result.deletedCount || 0} ghế trong phòng ${roomDoc.name}`;
    req.auditTarget  = {
      type: 'Room',
      id:   roomDoc._id,
      name: roomDoc.name,
    };

    res.json({ ok: true, deleted: result.deletedCount });
  } catch (err) { next(err); }
};
