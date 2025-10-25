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
    res.status(201).json({ message: 'Created', movie });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: 'Updated', movie });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    await Movie.findByIdAndDelete(req.params.id);
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