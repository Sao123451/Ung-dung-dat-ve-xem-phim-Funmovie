// controller/showtimeController.js
const mongoose = require('mongoose');
const Showtime = require('../models/Showtime');
const Room = require('../models/Room');
const Movie = require('../models/Movie');
const Seat = require('../models/Seat');
const TicketSeat = require('../models/TicketSeat');

/* ============================ Helpers ============================ */

/** Buffer giữa 2 suất chiếu (ms). Mặc định 30 phút, có thể set SHOWTIME_BUFFER_MIN=60 */
function getBufferMs() {
  const m = parseInt(process.env.SHOWTIME_BUFFER_MIN || '30', 10);
  return (Number.isFinite(m) ? m : 30) * 60 * 1000;
}

/** Khoảng ngày theo VN (UTC+7) từ tham số YYYY-MM-DD (hoặc hôm nay nếu thiếu) */
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

/** Tìm suất giao thoa trong cùng phòng có xét buffer (loại trừ id hiện tại nếu update) */
async function findConflicts(roomId, startTime, endTime, excludeId = null) {
  const bufferMs = getBufferMs();
  const endPlusBuf = new Date(endTime.getTime() + bufferMs);
  const startMinusBuf = new Date(startTime.getTime() - bufferMs);

  const q = {
    room: roomId,
    status: { $in: ['scheduled', 'ongoing'] },
    start_time: { $lt: endPlusBuf },
    end_time: { $gt: startMinusBuf },
  };
  if (excludeId) q._id = { $ne: excludeId };

  const candidates = await Showtime.find(q).lean();

  // existing.start < newEnd+buf && existing.end+buf > newStart
  const conflict = candidates.find((c) => {
    const cStart = new Date(c.start_time).getTime();
    const cEndPlus = new Date(c.end_time).getTime() + bufferMs;
    return cStart < endPlusBuf.getTime() && cEndPlus > startTime.getTime();
  });

  return conflict || null;
}

/* ============================= PUBLIC ============================= */

/**
 * GET /api/showtimes/public/by-cinema?cinema=<id>&date=YYYY-MM-DD&type=2D
 * Trả movies[] mỗi phần tử chứa các showtimes có available_seats realtime
 */
exports.publicByCinema = async (req, res, next) => {
  try {
    const { cinema, date } = req.query;
    let { type } = req.query;

    if (!cinema || !mongoose.isValidObjectId(String(cinema))) {
      return res.status(400).json({ message: 'cinema is required & must be valid ObjectId' });
    }

    type = typeof type === 'string' ? String(type).toUpperCase().trim() : null;
    if (type && !['2D', '3D', 'IMAX'].includes(type)) type = null;

    const { start, end } = getDateRange(date);

    let roomFilter = {};
    if (type) {
      const roomIds = await Room.find({ cinema, type }).distinct('_id').lean();
      if (!roomIds.length) {
        return res.json({ cinema: String(cinema), date: start.toISOString().slice(0, 10), movies: [] });
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

      // GHẾ TRỐNG REALTIME = (ghế usable) - (ghế đang lock reserved/booked chưa hết hạn)
      const [allSeats, locks] = await Promise.all([
        Seat.find({ room: s.room?._id || s.room })
          .select('_id seat_status')
          .lean(),
        TicketSeat.find({
          showtime: s._id,
          status: { $in: ['reserved', 'booked'] },
          expires_at: { $gt: new Date() },
        })
          .select('seat')
          .lean(),
      ]);

      const lockedSet = new Set(locks.map((x) => String(x.seat)));
      const usable = allSeats.filter(
        (se) => se.seat_status !== 'broken' && se.seat_status !== 'sold'
      );

      let available = 0;
      for (const se of usable) {
        if (!lockedSet.has(String(se._id))) available++;
      }

      map.get(mid).showtimes.push({
        _id: String(s._id),
        start_time: s.start_time,
        room_type: s.room?.type || '2D',
        room_name: s.room?.name || '',
        available_seats: available,
        ticket_price: s.ticket_price,
      });
    }

    res.json({
      cinema: String(cinema),
      date: start.toISOString().slice(0, 10),
      movies: Array.from(map.values()),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/showtimes/:id/seats
 * Trả chi tiết phòng + danh sách ghế với seat_status chính xác:
 * - Nếu đang lock: booked -> sold, reserved -> reserved
 * - Nếu DB có seat_status: dùng luôn
 * - Nếu schema cũ: fallback từ active/is_booked
 */
exports.publicSeatsByShowtime = async (req, res, next) => {
  try {
    const id = String(req.params.id).trim();
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const s = await Showtime.findById(id).populate('room movie cinema');
    if (!s) return res.status(404).json({ message: 'Showtime not found' });

    const [seats, locks] = await Promise.all([
      Seat.find({ room: s.room._id })
        .select('_id row number seat_type extra_price seat_status active is_booked')
        .sort({ row: 1, number: 1 })
        .lean(),
      TicketSeat.find({
        showtime: s._id,
        status: { $in: ['reserved', 'booked'] },
        expires_at: { $gt: new Date() },
      })
        .select('seat status')
        .lean(),
    ]);

    const locked = new Map(locks.map((x) => [String(x.seat), x.status]));

    const seatsOut = seats.map((se) => {
      // Ưu tiên trạng thái lock realtime
      if (locked.has(String(se._id))) {
        const st = locked.get(String(se._id));
        return {
          _id: se._id,
          row: se.row,
          number: se.number,
          seat_type: se.seat_type,
          extra_price: se.extra_price,
          seat_status: st === 'booked' ? 'sold' : 'reserved',
        };
      }
      // Dùng seat_status nếu có
      if (se.seat_status) {
        return {
          _id: se._id,
          row: se.row,
          number: se.number,
          seat_type: se.seat_type,
          extra_price: se.extra_price,
          seat_status: se.seat_status,
        };
      }
      // Fallback tương thích schema cũ
      const fallback = !se.active ? 'broken' : se.is_booked ? 'sold' : 'available';
      return {
        _id: se._id,
        row: se.row,
        number: se.number,
        seat_type: se.seat_type,
        extra_price: se.extra_price,
        seat_status: fallback,
      };
    });

    res.json({
      showtime: {
        _id: s._id,
        ticket_price: s.ticket_price,
        room: { _id: s.room._id, name: s.room.name, type: s.room.type },
      },
      seats: seatsOut,
    });
  } catch (err) {
    next(err);
  }
};

/* ============================== CRUD ============================== */

exports.getAll = async (req, res, next) => {
  try {
    const list = await Showtime.find().populate('movie cinema room');
    res.json(list);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const s = await Showtime.findById(req.params.id).populate('movie cinema room');
    if (!s) return res.status(404).json({ message: 'Not found' });
    res.json(s);
  } catch (err) {
    next(err);
  }
};

/** POST /api/showtimes */
exports.create = async (req, res, next) => {
  try {
    const { movie, cinema, room, start_time, end_time, ticket_price } = req.body;

    if (!mongoose.isValidObjectId(String(movie)))
      return res.status(400).json({ message: 'Invalid movie id' });
    if (!mongoose.isValidObjectId(String(cinema)))
      return res.status(400).json({ message: 'Invalid cinema id' });
    if (!mongoose.isValidObjectId(String(room)))
      return res.status(400).json({ message: 'Invalid room id' });
    if (!start_time) return res.status(400).json({ message: 'start_time is required' });
    if (typeof ticket_price !== 'number')
      return res.status(400).json({ message: 'ticket_price is required (number)' });

    const [roomDoc, movieDoc] = await Promise.all([Room.findById(room).lean(), Movie.findById(movie).lean()]);
    if (!roomDoc) return res.status(404).json({ message: 'Room not found' });
    if (!movieDoc) return res.status(404).json({ message: 'Movie not found' });

    const startTime = new Date(start_time);
    const endTime = end_time
      ? new Date(end_time)
      : new Date(startTime.getTime() + (movieDoc.duration || 120) * 60000);

    // Chặn giao thoa + buffer
    const conflict = await findConflicts(room, startTime, endTime, null);
    if (conflict) {
      const bufferMin = getBufferMs() / 60000;
      const endPlusBuffer = new Date(new Date(conflict.end_time).getTime() + getBufferMs());
      return res.status(400).json({
        message: 'Showtime overlaps or violates buffer in this room',
        buffer_min: bufferMin,
        conflict: {
          id: conflict._id,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
          end_plus_buffer: endPlusBuffer,
        },
      });
    }

    const showtime = await Showtime.create({
      movie,
      cinema,
      room,
      start_time: startTime,
      end_time: endTime,
      ticket_price,
      status: 'scheduled',
    });

    // available_seats realtime (đơn giản)
    const [allSeats, locks] = await Promise.all([
      Seat.find({ room }).select('_id seat_status').lean(),
      TicketSeat.find({
        showtime: showtime._id,
        status: { $in: ['reserved', 'booked'] },
        expires_at: { $gt: new Date() },
      })
        .select('seat')
        .lean(),
    ]);
    const locked = new Set(locks.map((x) => String(x.seat)));
    const usable = allSeats.filter((se) => se.seat_status !== 'broken' && se.seat_status !== 'sold');
    const available = usable.reduce((n, se) => (locked.has(String(se._id)) ? n : n + 1), 0);

    res.status(201).json({
      message: 'Created',
      showtime: { ...showtime.toObject(), available_seats: available },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: 'Duplicate start_time in this room' });
    }
    next(err);
  }
};

/** PUT /api/showtimes/:id */
exports.update = async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const s = await Showtime.findById(id);
    if (!s) return res.status(404).json({ message: 'Not found' });

    const roomId = req.body.room ? String(req.body.room) : String(s.room);
    const movieId = req.body.movie ? String(req.body.movie) : String(s.movie);

    const mv = await Movie.findById(movieId).lean();
    const startTime = req.body.start_time ? new Date(req.body.start_time) : s.start_time;
    const endTime = req.body.end_time
      ? new Date(req.body.end_time)
      : s.end_time || new Date(startTime.getTime() + (mv?.duration || 120) * 60000);

    const conflict = await findConflicts(roomId, startTime, endTime, s._id);
    if (conflict) {
      const bufferMin = getBufferMs() / 60000;
      const endPlusBuffer = new Date(new Date(conflict.end_time).getTime() + getBufferMs());
      return res.status(400).json({
        message: 'Showtime overlaps or violates buffer in this room',
        buffer_min: bufferMin,
        conflict: {
          id: conflict._id,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
          end_plus_buffer: endPlusBuffer,
        },
      });
    }

    s.movie = mongoose.isValidObjectId(movieId) ? movieId : s.movie;
    s.cinema = req.body.cinema || s.cinema;
    s.room = roomId;
    s.start_time = startTime;
    s.end_time = endTime;
    if (typeof req.body.ticket_price === 'number') s.ticket_price = req.body.ticket_price;
    if (req.body.status) s.status = req.body.status;
    await s.save();

    // available_seats realtime sau update
    const [allSeats, locks] = await Promise.all([
      Seat.find({ room: s.room }).select('_id seat_status').lean(),
      TicketSeat.find({
        showtime: s._id,
        status: { $in: ['reserved', 'booked'] },
        expires_at: { $gt: new Date() },
      })
        .select('seat')
        .lean(),
    ]);
    const locked = new Set(locks.map((x) => String(x.seat)));
    const usable = allSeats.filter((se) => se.seat_status !== 'broken' && se.seat_status !== 'sold');
    const available = usable.reduce((n, se) => (locked.has(String(se._id)) ? n : n + 1), 0);

    res.json({ message: 'Updated', showtime: { ...s.toObject(), available_seats: available } });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: 'Duplicate start_time in this room' });
    }
    next(err);
  }
};

/** DELETE /api/showtimes/:id */
exports.delete = async (req, res, next) => {
  try {
    await Showtime.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
