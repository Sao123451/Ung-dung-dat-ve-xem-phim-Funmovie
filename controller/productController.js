// controller/productController.js
const Product = require('../models/Product');

exports.publicList = async (req, res, next) => {
  try {
    const { type, q, page=1, limit=50 } = req.query;
    const filter = { active: true };
    if (type) filter.type = type;
    if (q) filter.name = new RegExp(String(q).trim(), 'i');

    const skip = (parseInt(page,10)-1)*parseInt(limit,10);
    const [items, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit,10)),
      Product.countDocuments(filter)
    ]);
    res.json({ items, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
};

exports.adminList = async (req, res, next) => {
  try { res.json(await Product.find().sort({ createdAt: -1 })); }
  catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try { res.status(201).json(await Product.create(req.body)); }
  catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const del = await Product.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
};
