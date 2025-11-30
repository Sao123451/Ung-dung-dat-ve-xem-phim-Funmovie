// controller/roomController.js
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Cinema = require('../models/Cinema');
const { PRESETS } = require('../config/seatLayouts');
const { regenerateSeatsForRoom } = require('../services/seatGenerator');

// ===== PUBLIC =====
exports.publicList = async (req, res, next) => {
  try {
    const { cinema, type } = req.query;
    const filter = {};
    if (cinema) {
      const id = String(cinema).trim();
      if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid cinema id' });
      filter.cinema = id;
    }
    if (type) filter.type = type;

    const rooms = await Room.find(filter)
      .select('-__v -updatedAt')
      .sort({ name: 1 })
      .lean();

    res.json(rooms);
  } catch (err) { next(err); }
};

exports.publicDetail = async (req, res, next) => {
  try {
    const rawId = String(req.params.id || '').trim();
    if (!mongoose.isValidObjectId(rawId)) return res.status(400).json({ message: 'Invalid id' });

    const room = await Room.findById(rawId)
      .populate('cinema', 'name city address')
      .lean();
    if (!room) return res.status(404).json({ message: 'Not found' });

    res.json(room);
  } catch (err) { next(err); }
};

// ===== ADMIN / MANAGER =====
exports.list = async (req, res, next) => {
  try {
    const { q, cinema, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) filter.name = { $regex: q, $options: 'i' };
    if (cinema) {
      const id = String(cinema).trim();
      if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid cinema id' });
      filter.cinema = id;
    }
    if (type) filter.type = type;

    const skip = (parseInt(page,10)-1) * parseInt(limit,10);
    const [items, total] = await Promise.all([
      Room.find(filter).populate('cinema', 'name city')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit,10)),
      Room.countDocuments(filter),
    ]);
    res.json({ items, total, page: parseInt(page,10), limit: parseInt(limit,10) });
  } catch (err) { next(err); }
};

// POST /api/rooms  { cinema, name, type?, layout_key? }
exports.create = async (req, res, next) => {
  try {
    const { cinema, name, type, layout_key } = req.body;
    if (!cinema || !mongoose.isValidObjectId(String(cinema)))
      return res.status(400).json({ message: 'cinema is required & must be valid ObjectId' });
    if (!name) return res.status(400).json({ message: 'name is required' });

    const cin = await Cinema.findById(cinema).lean();
    if (!cin) return res.status(404).json({ message: 'Cinema not found' });

    const existed = await Room.findOne({ cinema, name: String(name).trim() }).lean();
    if (existed) return res.status(400).json({ message: 'Room name already exists in this cinema' });

    const presetKey = layout_key || 'STD_10x10_2D';
    const preset = PRESETS[presetKey];
    if (!preset) return res.status(400).json({ message: 'Invalid layout_key' });

    // 1) tạo room
    let room = await Room.create({
      cinema,
      name: String(name).trim(),
      type: type || '2D',
      layout_key: presetKey,
      rows: preset.rows,
      cols: preset.cols,
      enforce_layout: true,
      capacity: 0,
    });

    // 2) sinh ghế (không transaction)
    try {
      const inserted = await regenerateSeatsForRoom(room, presetKey);
      room.capacity = inserted;
      room = await room.save();

      // AUDIT: tạo phòng + sinh ghế
      req.auditAction  = 'room.create';
      req.auditSummary = `Tạo phòng "${room.name}" tại rạp ${cin.name} (layout: ${presetKey}, ghế: ${inserted})`;
      req.auditTarget  = {
        type: 'Room',
        id:   room._id,
        name: room.name,
      };

      return res.status(201).json({ ...room.toObject(), capacity: inserted });
    } catch (e) {
      // rollback thủ công nếu sinh ghế lỗi
      await Room.findByIdAndDelete(room._id).catch(()=>{});
      throw e;
    }
  } catch (err) { next(err); }
};

// PUT /api/rooms/:id   (không đổi layout ở đây)
exports.update = async (req, res, next) => {
  try {
    const rawId = String(req.params.id || '').trim();
    if (!mongoose.isValidObjectId(rawId)) return res.status(400).json({ message: 'Invalid id' });

    const room = await Room.findById(rawId);
    if (!room) return res.status(404).json({ message: 'Not found' });

    const { cinema, name, type } = req.body;

    if (typeof cinema !== 'undefined') {
      if (!mongoose.isValidObjectId(String(cinema))) return res.status(400).json({ message: 'Invalid cinema id' });
      const cin = await Cinema.findById(cinema).lean();
      if (!cin) return res.status(404).json({ message: 'Cinema not found' });
      room.cinema = cinema;
    }
    if (typeof name !== 'undefined') room.name = String(name).trim();
    if (typeof type !== 'undefined') room.type = type;

    const dup = await Room.findOne({
      _id: { $ne: room._id },
      cinema: room.cinema,
      name: room.name
    }).lean();
    if (dup) return res.status(400).json({ message: 'Room name already exists in this cinema' });

    await room.save();

    // AUDIT: cập nhật phòng
    req.auditAction  = 'room.update';
    req.auditSummary = `Cập nhật phòng "${room.name}" (rạp: ${room.cinema?.name || room.cinema})`;
    req.auditTarget  = {
      type: 'Room',
      id:   room._id,
      name: room.name,
    };

    res.json(room);
  } catch (err) { next(err); }
};

// POST /api/rooms/:id/regenerate-seats  { layout_key?: 'STD_10x10_2D' | 'STD_10x8_2D', keep_enforce? }
exports.regenerateSeats = async (req, res, next) => {
  try {
    const rawId = String(req.params.id || '').trim();
    if (!mongoose.isValidObjectId(rawId)) return res.status(400).json({ message: 'Invalid id' });

    const { layout_key, keep_enforce } = req.body || {};
    const room = await Room.findById(rawId);
    if (!room) return res.status(404).json({ message: 'Not found' });

    const key = layout_key || room.layout_key;
    const preset = PRESETS[key];
    if (!preset) return res.status(400).json({ message: 'Invalid layout_key' });

    room.layout_key = key;
    room.rows = preset.rows;
    room.cols = preset.cols;
    if (typeof keep_enforce === 'boolean') room.enforce_layout = keep_enforce;

    const inserted = await regenerateSeatsForRoom(room, key); // không session
    room.capacity = inserted;
    await room.save();

    // AUDIT: regenerate sơ đồ ghế
    req.auditAction  = 'room.regenerateSeats';
    req.auditSummary = `Regenerate ghế phòng "${room.name}" (rạp: ${room.cinema?.name || room.cinema}, layout: ${key}, ghế: ${inserted})`;
    req.auditTarget  = {
      type: 'Room',
      id:   room._id,
      name: room.name,
    };

    res.json({ ok: true, capacity: inserted, layout_key: key, enforce_layout: room.enforce_layout });
  } catch (err) { next(err); }
};

// DELETE /api/rooms/:id
exports.remove = async (req, res, next) => {
  try {
    const rawId = String(req.params.id || '').trim();
    if (!mongoose.isValidObjectId(rawId)) return res.status(400).json({ message: 'Invalid id' });
    const deleted = await Room.findByIdAndDelete(rawId);
    if (!deleted) return res.status(404).json({ message: 'Not found' });


     // AUDIT: xóa phòng
    req.auditAction  = 'room.delete';
    req.auditSummary = `Xóa phòng "${deleted.name}" (rạp: ${deleted.cinema})`;
    req.auditTarget  = {
      type: 'Room',
      id:   deleted._id,
      name: deleted.name,
    };



    res.json({ ok: true });
  } catch (err) { next(err); }
};
