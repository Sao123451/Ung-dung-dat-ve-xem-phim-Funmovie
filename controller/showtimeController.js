// controller/showtimeController.js
const Showtime = require('../models/Showtime');

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
    const obj = req.body;
    // compute available_seats from room capacity if provided
    const showtime = await Showtime.create(obj);
    res.status(201).json({ message: 'Created', showtime });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const s = await Showtime.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: 'Updated', showtime: s });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    await Showtime.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
