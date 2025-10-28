// controller/roomController.js
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Cinema = require('../models/Cinema');

// ===== PUBLIC (Android) =====

// GET /api/rooms/public?cinema=<cinemaId>&type=2D
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

// GET /api/rooms/:id/public
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

// GET /api/rooms?q=&cinema=&type=&page=1&limit=20
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
      Room.find(filter)
        .populate('cinema', 'name city')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit,10)),
      Room.countDocuments(filter),
    ]);

    res.json({ items, total, page: parseInt(page,10), limit: parseInt(limit,10) });
  } catch (err) { next(err); }
};

// POST /api/rooms
// body: { cinema, name, type?, capacity? }
exports.create = async (req, res, next) => {
  try {
    const { cinema, name, type, capacity } = req.body;
    if (!cinema || !mongoose.isValidObjectId(String(cinema)))
      return res.status(400).json({ message: 'cinema is required & must be valid ObjectId' });
    if (!name) return res.status(400).json({ message: 'name is required' });

    const cin = await Cinema.findById(cinema).lean();
    if (!cin) return res.status(404).json({ message: 'Cinema not found' });

    // enforce unique name within a cinema (logic-level)
    const existed = await Room.findOne({ cinema, name: name.trim() }).lean();
    if (existed) return res.status(400).json({ message: 'Room name already exists in this cinema' });

    const doc = await Room.create({
      cinema,
      name: name.trim(),
      type: type || '2D',
      capacity: Number.isFinite(+capacity) ? +capacity : 0,
    });

    res.status(201).json(doc);
  } catch (err) { next(err); }
};

// PUT /api/rooms/:id
exports.update = async (req, res, next) => {
  try {
    const rawId = String(req.params.id || '').trim();
    if (!mongoose.isValidObjectId(rawId)) return res.status(400).json({ message: 'Invalid id' });

    const room = await Room.findById(rawId);
    if (!room) return res.status(404).json({ message: 'Not found' });

    const { cinema, name, type, capacity } = req.body;

    if (typeof cinema !== 'undefined') {
      if (!mongoose.isValidObjectId(String(cinema))) return res.status(400).json({ message: 'Invalid cinema id' });
      const cin = await Cinema.findById(cinema).lean();
      if (!cin) return res.status(404).json({ message: 'Cinema not found' });
      room.cinema = cinema;
    }
    if (typeof name !== 'undefined') room.name = String(name).trim();
    if (typeof type !== 'undefined') room.type = type;
    if (typeof capacity !== 'undefined') room.capacity = Number.isFinite(+capacity) ? +capacity : room.capacity;

    // unique check when cinema or name changes
    const dup = await Room.findOne({
      _id: { $ne: room._id },
      cinema: room.cinema,
      name: room.name
    }).lean();
    if (dup) return res.status(400).json({ message: 'Room name already exists in this cinema' });

    await room.save();
    res.json(room);
  } catch (err) { next(err); }
};

// DELETE /api/rooms/:id
exports.remove = async (req, res, next) => {
  try {
    const rawId = String(req.params.id || '').trim();
    if (!mongoose.isValidObjectId(rawId)) return res.status(400).json({ message: 'Invalid id' });

    // (Tuỳ bạn: chặn xoá nếu còn showtime liên quan)
    await Room.findByIdAndDelete(rawId);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
