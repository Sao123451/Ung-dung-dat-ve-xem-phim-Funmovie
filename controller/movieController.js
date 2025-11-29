// controller/movieController.js
const Movie = require('../models/Movie');

exports.getAll = async (req, res, next) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const m = await Movie.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Not found' });
    res.json(m);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const movie = await Movie.create(req.body);

    // ⭐ AUDIT LOG: tạo phim
    req.auditAction  = 'movie.create';
    req.auditSummary = `Tạo phim mới: ${movie.title || '(không tên)'}`;
    req.auditTarget  = {
      type: 'Movie',
      id:   movie._id,
      name: movie.title
    };

    res.status(201).json({ message: 'Created', movie });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // ⭐ AUDIT LOG: cập nhật phim
    req.auditAction  = 'movie.update';
    req.auditSummary = `Cập nhật phim: ${movie.title || '(không tên)'}`;
    req.auditTarget  = {
      type: 'Movie',
      id:   movie._id,
      name: movie.title
    };

    res.json({ message: 'Updated', movie });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const deleted = await Movie.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });

    // ⭐ AUDIT LOG: xóa phim
    req.auditAction  = 'movie.delete';
    req.auditSummary = `Xóa phim: ${deleted.title || '(không tên)'}`;
    req.auditTarget  = {
      type: 'Movie',
      id:   deleted._id,
      name: deleted.title
    };

    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.getComing = async (req, res, next) => {
  try {
    const movies = await Movie.find({ status: 'coming' });
    res.json(movies);
  } catch (err) {
    next(err);
  }
};

exports.getNowShowing = async (req, res, next) => {
  try {
    const movies = await Movie.find({ status: 'now_showing' });
    res.json(movies);
  } catch (err) {
    next(err);
  }
};

exports.getArchived = async (req, res, next) => {
  try {
    const movies = await Movie.find({ status: 'archived' });
    res.json(movies);
  } catch (err) {
    next(err);
  }
};