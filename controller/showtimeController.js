// controller/showtimeController.js
const mongoose = require('mongoose');
const Showtime = require('../models/Showtime');
const Room = require('../models/Room');
const Movie = require('../models/Movie');
const Seat = require('../models/Seat'); // <-- dùng cho /:id/seats

/**
 * Lấy khoảng 1 ngày theo múi giờ Việt Nam (UTC+07:00)
 * Input: YYYY-MM-DD (nếu không truyền -> hôm nay theo VN)
 */
function getDateRange(dateStr) {
  const yyyyMMdd =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? dateStr
      : new Date().toISOString().slice(0, 10);

  const start = new Date(`${yyyyMMdd}T00:00:00+07:00`);
  const end = new Date(`${yyyyMMdd}T00:00:00+07:00`);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// ===== PUBLIC =====
// GET /api/showtimes/public/by-cinema?cinema=<id>&date=YYYY-MM-DD&type=2D
exports.publicByCinema = async (req, res, next) => {
  try {
    const { cinema, date } = req.query;
    let { type } = req.query; // "2D" | "3D" | "IMAX" (optional)

    if (!cinema || !mongoose.isValidObjectId(String(cinema))) {
      return res
        .status(400)
        .json({ message: 'cinema is required & must be valid ObjectId' });
    }

    type = typeof type === 'string' ? String(type).toUpperCase().trim() : null;
    if (type && !['2D', '3D', 'IMAX'].includes(type)) type = null;

    const { start, end } = getDateRange(date);

    let roomFilter = {};
    if (type) {
      const roomIds = await Room.find({ cinema, type }).distinct('_id').lean();
      if (!roomIds.length) {
        return res.json({
          cinema: String(cinema),
          date: start.toISOString().slice(0, 10),
          movies: [],
        });
      }
      roomFilter = { room: { $in: roomIds } };
    }

    const items = await Showtime.find({
      cinema,
      ...roomFilter,
      start_time: { $gte: start, $lt: end },
      status: { $in: ['scheduled', 'ongoing'] },
    })
      .populate('movie', 'title poster genre duration')
      .populate('room', 'name type')
      .sort({ start_time: 1 })
      .lean();

    const map = new Map();
    for (const s of items) {
      const mid = String(s.movie?._id || s.movie);
      if (!map.has(mid)) {
        map.set(mid, {
          movie: {
            _id: mid,
            title: s.movie?.title || '',
            poster: s.movie?.poster || '',
            genre: s.movie?.genre || [],
            duration: s.movie?.duration ?? null,
          },
          showtimes: [],
        });
      }
      map.get(mid).showtimes.push({
        _id: String(s._id),
        start_time: s.start_time,
        room_type: s.room?.type || '2D',
        room_name: s.room?.name || '',
        available_seats: s.available_seats ?? 0,
        ticket_price: s.ticket_price,
      });
    }

    res.json({
      cinema: String(cinema),
      date: start.toISOString().slice(0, 10),
      movies: Array.from(map.values()),
    });
  } catch (err) { next(err); }
};

exports.publicSeatsByShowtime = async (req, res, next) => {
  try {
    const id = String(req.params.id).trim();
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const s = await Showtime
      .findById(id)
      .populate('room movie cinema');

    if (!s) return res.status(404).json({ message: 'Showtime not found' });

    // ✅ Lấy đúng status ghế từ DB
    const seats = await Seat.find({ room: s.room._id })
      .select('_id row number seat_type extra_price seat_status')
      .sort({ row: 1, number: 1 })
      .lean();

    // ✅ map về đúng format Android đang dùng
    res.json({
      showtime: {
        _id: s._id,
        ticket_price: s.ticket_price,
        room: {
          _id: s.room._id,
          name: s.room.name,
          type: s.room.type
        }
      },
      seats: seats.map(seat => ({
        _id: seat._id,
        row: seat.row,
        number: seat.number,
        seat_type: seat.seat_type,
        extra_price: seat.extra_price,
        seat_status: seat.seat_status // ⬅ Android nhận trực tiếp
      }))
    });

  } catch (err) { next(err); }
};


// ===== CRUD =====
exports.getAll = async (req, res, next) => {
  try {
    const list = await Showtime.find().populate('movie cinema room');
    res.json(list);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const s = await Showtime.findById(req.params.id).populate('movie cinema room');
    if (!s) return res.status(404).json({ message: 'Not found' });
    res.json(s);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { movie, cinema, room, start_time } = req.body;

    if (!mongoose.isValidObjectId(String(movie)))  return res.status(400).json({ message: 'Invalid movie id' });
    if (!mongoose.isValidObjectId(String(cinema))) return res.status(400).json({ message: 'Invalid cinema id' });
    if (!mongoose.isValidObjectId(String(room)))   return res.status(400).json({ message: 'Invalid room id' });
    if (!start_time) return res.status(400).json({ message: 'start_time is required' });

    const [roomDoc, movieDoc] = await Promise.all([
      Room.findById(room).lean(),
      Movie.findById(movie).lean(),
    ]);
    if (!roomDoc)  return res.status(404).json({ message: 'Room not found' });
    if (!movieDoc) return res.status(404).json({ message: 'Movie not found' });

    let endTime = req.body.end_time ? new Date(req.body.end_time) : null;
    const startTime = new Date(start_time);
    if (!endTime && Number.isFinite(+movieDoc.duration)) {
      endTime = new Date(startTime.getTime() + movieDoc.duration * 60 * 1000);
    }

    const availableSeats =
      typeof req.body.available_seats === 'number'
        ? req.body.available_seats
        : (roomDoc.capacity || 0);

    const assumedEndIfMissing = new Date(startTime.getTime() + 6 * 60 * 60 * 1000);
    const overlap = await Showtime.findOne({
      room,
      $or: [{
        start_time: { $lt: endTime || assumedEndIfMissing },
        end_time: { $gt: startTime },
      }],
    }).lean();
    if (overlap) {
      return res.status(400).json({ message: 'Showtime overlaps existing session in this room' });
    }

    const showtime = await Showtime.create({
      ...req.body,
      end_time: endTime || req.body.end_time || null,
      available_seats: availableSeats,
    });

    res.status(201).json({ message: 'Created', showtime });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const payload = { ...req.body };

    if (payload.room || payload.start_time || payload.end_time) {
      const s = await Showtime.findById(id).lean();
      if (!s) return res.status(404).json({ message: 'Not found' });

      const room = String(payload.room || s.room);
      const startTime = new Date(payload.start_time || s.start_time);
      let endTime = payload.end_time ? new Date(payload.end_time) : s.end_time;

      if (!endTime) {
        const mv = await Movie.findById(payload.movie || s.movie).lean();
        if (mv?.duration) endTime = new Date(startTime.getTime() + mv.duration * 60 * 1000);
      }

      const assumedEndIfMissing = new Date(startTime.getTime() + 6 * 60 * 60 * 1000);
      const overlap = await Showtime.findOne({
        _id: { $ne: id },
        room,
        $or: [{
          start_time: { $lt: endTime || assumedEndIfMissing },
          end_time: { $gt: startTime },
        }],
      }).lean();
      if (overlap)
        return res.status(400).json({ message: 'Showtime overlaps existing session in this room' });
    }

    const s = await Showtime.findByIdAndUpdate(id, payload, { new: true });
    res.json({ message: 'Updated', showtime: s });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    await Showtime.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
