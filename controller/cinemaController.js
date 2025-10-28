// controller/cinemaController.js
const mongoose = require('mongoose');
const Cinema = require('../models/Cinema');

// ===== PUBLIC =====

// GET /api/cinemas/public?q=&city=&page=1&limit=20
exports.publicList = async (req, res, next) => {
  try {
    const { q, city, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } }
      ];
    }
    if (city) filter.city = city;

    const skip = (parseInt(page,10)-1) * parseInt(limit,10);
    const [items, total] = await Promise.all([
      Cinema.find(filter).sort({ name: 1 }).skip(skip).limit(parseInt(limit,10)),
      Cinema.countDocuments(filter)
    ]);

    res.json({ items, total, page: parseInt(page,10), limit: parseInt(limit,10) });
  } catch (err) { next(err); }
};

// GET /api/cinemas/:id/public
exports.publicDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    const cinema = await Cinema.findById(id);
    if (!cinema) return res.status(404).json({ message: 'Not found' });
    res.json(cinema);
  } catch (err) { next(err); }
};

// ===== ADMIN / MANAGER =====

// GET /api/cinemas?q=&city=&page=1&limit=20
exports.list = async (req, res, next) => {
  try {
    const { q, city, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
        { hotline: { $regex: q, $options: 'i' } }
      ];
    }
    if (city) filter.city = city;

    const skip = (parseInt(page,10)-1) * parseInt(limit,10);
    const [items, total] = await Promise.all([
      Cinema.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit,10)),
      Cinema.countDocuments(filter)
    ]);

    res.json({ items, total, page: parseInt(page,10), limit: parseInt(limit,10) });
  } catch (err) { next(err); }
};

// POST /api/cinemas
exports.create = async (req, res, next) => {
  try {
    const { name, address, city, hotline } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const doc = await Cinema.create({
      name: name.trim(),
      address: address?.trim() || '',
      city: city?.trim() || '',
      hotline: hotline?.trim() || ''
    });
    res.status(201).json(doc);
  } catch (err) { next(err); }
};

// PUT /api/cinemas/:id
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const payload = {};
    ['name','address','city','hotline'].forEach(k => {
      if (typeof req.body[k] !== 'undefined') payload[k] = String(req.body[k] || '').trim();
    });

    const doc = await Cinema.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) { next(err); }
};

// DELETE /api/cinemas/:id
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    const del = await Cinema.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
};
