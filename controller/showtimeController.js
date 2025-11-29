// controller/showtimeController.js
const mongoose = require('mongoose');
const Showtime = require('../models/Showtime');
const Room = require('../models/Room');
const Movie = require('../models/Movie');
const Seat = require('../models/Seat');
const ShowtimeSeat = require('../models/ShowtimeSeat');

/* ============================ Helpers ============================ */

/** Buffer giữa 2 suất chiếu (ms). Mặc định 30 phút */
function getBufferMs() {
  const m = parseInt(process.env.SHOWTIME_BUFFER_MIN || '30', 10);
  return (Number.isFinite(m) ? m : 30) * 60 * 1000;
}

/** Lấy khoảng ngày theo dạng YYYY-MM-DD */
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

/** Tìm suất giao thoa trong cùng phòng */
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

  return await Showtime.findOne(q).lean();
}

/* ============================= PUBLIC ============================= */

/** GET /api/showtimes/public/by-cinema */
exports.publicByCinema = async (req, res, next) => {
  try {
    const { cinema, date, type } = req.query;

    if (!cinema || !mongoose.isValidObjectId(cinema))
      return res
        .status(400)
        .json({ message: "cinema is required & must be ObjectId" });

    // Ngày
    const { start, end } = getDateRange(date);

    // ⚡ BUILD FILTER CHO ROOM TYPE
    let roomMatch = {};
    if (type && ["2D", "3D", "IMAX"].includes(type)) {
      roomMatch = { type };
    }

    // Tìm suất chiếu
    const items = await Showtime.find({
      cinema,
      start_time: { $gte: start, $lt: end },
      status: { $in: ["scheduled", "ongoing"] },
    })
      .populate("movie", "title poster genre duration")
      .populate({
        path: "room",
        select: "name type",
        match: roomMatch, // ⭐ CHỈ LẤY PHÒNG ĐÚNG TYPE
      })
      .sort({ start_time: 1 })
      .lean();

    // ⭐ BỎ NHỮNG SUẤT CHIẾU KHÔNG TRÙNG LOẠI (room = null)
    const filtered = items.filter((s) => s.room);

    // Gom theo phim
    const map = new Map();

    for (const s of filtered) {
      const movieId = String(s.movie._id);

      if (!map.has(movieId)) {
        map.set(movieId, { movie: s.movie, showtimes: [] });
      }

      // ⭐ Đếm ghế available trong ShowtimeSeat
      const available = await ShowtimeSeat.countDocuments({
        showtime: s._id,
        status: "available",
      });

      map.get(movieId).showtimes.push({
        _id: s._id,
        start_time: s.start_time,
        room_name: s.room.name,
        room_type: s.room.type,
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


/** GET /api/showtimes/:id/seats */
exports.publicSeatsByShowtime = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: 'Invalid showtime id' });

    const s = await Showtime.findById(id)
      .populate('room movie cinema')
      .lean();

    if (!s) return res.status(404).json({ message: 'Showtime not found' });

    // ⭐ Lấy ghế từ ShowtimeSeat
    const seats = await ShowtimeSeat.find({ showtime: id })
      .select('row number seat_type extra_price status')
      .sort({ row: 1, number: 1 })
      .lean();

    res.json({
      showtime: {
        _id: s._id,
        ticket_price: s.ticket_price,
        room: s.room,
        cinema: s.cinema,
        movie: s.movie,
      },
      seats,
    });
  } catch (err) {
    next(err);
  }
};

/* ============================== CRUD ============================== */

/** GET all */
exports.getAll = async (req, res, next) => {
  try {
    const list = await Showtime.find().populate('movie cinema room');
    res.json(list);
  } catch (err) { next(err); }
};

/** GET by id */
exports.getById = async (req, res, next) => {
  try {
    const s = await Showtime.findById(req.params.id).populate('movie cinema room');
    if (!s) return res.status(404).json({ message: 'Not found' });
    res.json(s);
  } catch (err) { next(err); }
};

/** POST /api/showtimes */
exports.create = async (req, res, next) => {
  try {
    const { movie, cinema, room, start_time, end_time, ticket_price } = req.body;

    if (!mongoose.isValidObjectId(movie))
      return res.status(400).json({ message: 'Invalid movie id' });
    if (!mongoose.isValidObjectId(cinema))
      return res.status(400).json({ message: 'Invalid cinema id' });
    if (!mongoose.isValidObjectId(room))
      return res.status(400).json({ message: 'Invalid room id' });

    const movieDoc = await Movie.findById(movie).lean();
    if (!movieDoc) return res.status(404).json({ message: 'Movie not found' });

    const roomDoc = await Room.findById(room).lean();
    if (!roomDoc) return res.status(404).json({ message: 'Room not found' });

    const startTime = new Date(start_time);
    const endTimeReal = end_time
      ? new Date(end_time)
      : new Date(startTime.getTime() + (movieDoc.duration || 120) * 60000);

    const conflict = await findConflicts(room, startTime, endTimeReal);
    if (conflict) {
      return res.status(400).json({
        message: 'Showtime overlaps another showtime',
        conflict,
      });
    }

    const showtime = await Showtime.create({
      movie,
      cinema,
      room,
      start_time: startTime,
      end_time: endTimeReal,
      ticket_price,
      status: 'scheduled',
    });

    // ⭐ Clone ghế từ Seat → ShowtimeSeat
    const seats = await Seat.find({ room }).lean();

    const clones = seats.map((s) => ({
      showtime: showtime._id,
      seat: s._id,
      row: s.row,
      number: s.number,
      seat_type: s.seat_type,
      extra_price: s.extra_price,
      status: s.seat_status,
    }));

    await ShowtimeSeat.insertMany(clones);

     // ⭐ AUDIT: tạo suất chiếu
    req.auditAction  = 'showtime.create';
    req.auditSummary = `Tạo suất chiếu phim "${movieDoc.title}" tại phòng ${roomDoc.name} (${roomDoc.type}) lúc ${startTime.toLocaleString('vi-VN')}`;
    req.auditTarget  = {
      type: 'Showtime',
      id:   showtime._id,
      name: movieDoc.title,
    };

    res.status(201).json({
      message: 'Created',
      showtime,
    });
  } catch (err) { next(err); }
};

/** PUT /api/showtimes/:id */
exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const s = await Showtime.findById(id);
    if (!s) return res.status(404).json({ message: 'Not found' });

    const newRoom = req.body.room || s.room;

    // ⭐ Nếu đổi phòng → clone lại ghế
    if (req.body.room && req.body.room !== String(s.room)) {
      await ShowtimeSeat.deleteMany({ showtime: s._id });

      const newSeats = await Seat.find({ room: newRoom }).lean();

      const clones = newSeats.map((se) => ({
        showtime: s._id,
        seat: se._id,
        row: se.row,
        number: se.number,
        seat_type: se.seat_type,
        extra_price: se.extra_price,
        status: se.seat_status,
      }));

      await ShowtimeSeat.insertMany(clones);
    }

    if (req.body.start_time) s.start_time = new Date(req.body.start_time);
    if (req.body.end_time) s.end_time = new Date(req.body.end_time);
    if (req.body.ticket_price) s.ticket_price = req.body.ticket_price;
    if (req.body.status) s.status = req.body.status;
    s.room = newRoom;

    await s.save();

    const changedFields = Object.keys(req.body || {});
    // ⭐ AUDIT: cập nhật suất chiếu
    req.auditAction  = 'showtime.update';
    req.auditSummary = `Cập nhật suất chiếu phim "${s.movie?.title || s.movie}" tại phòng ${s.room?.name || s.room} (${s.room?.type || ''}): ${changedFields.join(', ') || 'không thay đổi trường nào'}`;
    req.auditTarget  = {
      type: 'Showtime',
      id:   s._id,
      name: s.movie?.title || s._id.toString(),
    };

    res.json({
      message: 'Updated',
      showtime: s,
    });
  } catch (err) { next(err); }
};

/** DELETE */
exports.delete = async (req, res, next) => {
  try {
    const id = req.params.id;
    const s = await Showtime.findById(id).populate('movie').populate('room').lean();
    if (!s) return res.status(404).json({ message: 'Not found' });


    await ShowtimeSeat.deleteMany({ showtime: id }); // ⭐ xoá ghế của suất
    await Showtime.findByIdAndDelete(id);

    // ⭐ AUDIT: xóa suất chiếu
    req.auditAction  = 'showtime.delete';
    req.auditSummary = `Xóa suất chiếu phim "${s.movie?.title || s.movie}" tại phòng ${s.room?.name || s.room} lúc ${s.start_time.toLocaleString('vi-VN')}`;
    req.auditTarget  = {
      type: 'Showtime',
      id:   s._id,
      name: s.movie?.title || s._id.toString(),
    };

    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
