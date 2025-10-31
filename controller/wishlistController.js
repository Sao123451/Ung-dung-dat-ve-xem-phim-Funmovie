// controller/wishlistController.js
const Wishlist = require('../models/Wishlist');
const Movie = require('../models/Movie');

const pickMovieFields = '_id title poster status genres duration release_date rating';

exports.myList = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Wishlist.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('movie', pickMovieFields),
      Wishlist.countDocuments({ user: userId })
    ]);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

exports.isFaved = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { movieId } = req.query;
    if (!movieId) return res.status(400).json({ message: 'movieId required' });

    const existed = await Wishlist.exists({ user: userId, movie: movieId });
    res.json({ faved: !!existed });
  } catch (err) { next(err); }
};

exports.add = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { movieId } = req.body;
    if (!movieId) return res.status(400).json({ message: 'movieId required' });

    // (tuỳ chọn) xác thực movie tồn tại
    const movie = await Movie.findById(movieId).select('_id');
    if (!movie) return res.status(404).json({ message: 'Movie not found' });

    // idempotent: nếu đã tồn tại thì trả về doc hiện có
    const doc = await Wishlist.findOneAndUpdate(
      { user: userId, movie: movieId },
      { $setOnInsert: { user: userId, movie: movieId } },
      { upsert: true, new: true }
    ).populate('movie', pickMovieFields);

    res.status(201).json(doc);
  } catch (err) {
    // phòng lỗi unique index
    if (err.code === 11000) return res.status(200).json({ message: 'Already in wishlist' });
    next(err);
  }
};

exports.removeByMovie = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { movieId } = req.params;
    if (!movieId) return res.status(400).json({ message: 'movieId required' });

    const result = await Wishlist.deleteOne({ user: userId, movie: movieId });
    res.json({ removed: result.deletedCount > 0 });
  } catch (err) { next(err); }
};

exports.toggle = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { movieId } = req.body;
    if (!movieId) return res.status(400).json({ message: 'movieId required' });

    const existed = await Wishlist.findOne({ user: userId, movie: movieId });
    if (existed) {
      await Wishlist.deleteOne({ _id: existed._id });
      return res.json({ faved: false });
    } else {
      // (tuỳ chọn) xác thực movie tồn tại
      const movie = await Movie.findById(movieId).select('_id');
      if (!movie) return res.status(404).json({ message: 'Movie not found' });

      await Wishlist.create({ user: userId, movie: movieId });
      return res.json({ faved: true });
    }
  } catch (err) { next(err); }
};

exports.clearMine = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const r = await Wishlist.deleteMany({ user: userId });
    res.json({ cleared: r.deletedCount });
  } catch (err) { next(err); }
};
