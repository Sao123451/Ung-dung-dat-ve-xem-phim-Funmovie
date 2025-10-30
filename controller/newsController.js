// controller/newsController.js
const mongoose = require('mongoose');
const News = require('../models/News');

const isId = v => /^[0-9a-fA-F]{24}$/.test(String(v||'').trim());
const baseUrl = (req) => (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/,'');
const toAbs = (req, u) => /^https?:\/\//i.test(u) ? u : `${baseUrl(req)}${u.startsWith('/') ? '' : '/'}${u}`;

/** PUBLIC: list bài đã publish (q, tag, page, limit) */
exports.publicList = async (req, res, next) => {
  try {
    const { q, tag, page = 1, limit = 10 } = req.query;
    const filter = { is_published: true };
    if (tag) filter.tags = tag.toLowerCase();
    if (q) filter.$text = { $search: q };

    const skip = (parseInt(page,10)-1) * parseInt(limit,10);
    const [items, total] = await Promise.all([
      News.find(filter)
        .sort({ published_at: -1, createdAt: -1 })
        .skip(skip).limit(parseInt(limit,10))
        .select('-__v'),
      News.countDocuments(filter)
    ]);

    // chuẩn hoá cover sang absolute
    const data = items.map(n => ({ ...n.toObject(), cover_image: n.cover_image ? toAbs(req, n.cover_image) : '' }));
    res.json({ items: data, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

/** PUBLIC: chi tiết theo id hoặc slug + tăng view_count */
exports.publicDetail = async (req, res, next) => {
  try {
    const key = req.params.idOrSlug;
    const filter = isId(key) ? { _id: key, is_published: true } : { slug: key, is_published: true };
    const doc = await News.findOneAndUpdate(filter, { $inc: { view_count: 1 } }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const obj = doc.toObject();
    obj.cover_image = obj.cover_image ? toAbs(req, obj.cover_image) : '';
    res.json(obj);
  } catch (e) { next(e); }
};

/** ADMIN: list tất cả (kể cả chưa publish) */
exports.list = async (req, res, next) => {
  try {
    const { q, tag, is_published, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (typeof is_published !== 'undefined') filter.is_published = is_published === 'true';
    if (tag) filter.tags = tag.toLowerCase();
    if (q) filter.$text = { $search: q };

    const skip = (parseInt(page,10)-1) * parseInt(limit,10);
    const [items, total] = await Promise.all([
      News.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit,10)),
      News.countDocuments(filter)
    ]);
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

/** ADMIN: detail */
exports.detail = async (req, res, next) => {
  try {
    const doc = await News.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

/** ADMIN: create (multipart optional field 'cover' hoặc body.cover_image) */
exports.create = async (req, res, next) => {
  try {
    const payload = {
      title: req.body.title,
      slug: req.body.slug,
      content: req.body.content,
      excerpt: req.body.excerpt || '',
      tags: Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? String(req.body.tags).split(',') : []),
      is_published: !!req.body.is_published,
      published_at: req.body.is_published ? (req.body.published_at || new Date()) : null,
      author: req.user?._id || null
    };
    if (req.file) payload.cover_image = `/public/uploads/${req.file.filename}`;
    else if (req.body.cover_image) payload.cover_image = req.body.cover_image;

    const doc = await News.create(payload);
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

/** ADMIN: update */
exports.update = async (req, res, next) => {
  try {
    const doc = await News.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    if (typeof req.body.title !== 'undefined') doc.title = req.body.title;
    if (typeof req.body.slug !== 'undefined') doc.slug = req.body.slug;
    if (typeof req.body.content !== 'undefined') doc.content = req.body.content;
    if (typeof req.body.excerpt !== 'undefined') doc.excerpt = req.body.excerpt;
    if (typeof req.body.is_published !== 'undefined') doc.is_published = !!req.body.is_published;
    if (typeof req.body.published_at !== 'undefined') doc.published_at = req.body.published_at || null;

    if (typeof req.body.tags !== 'undefined') {
      doc.tags = Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags).split(',');
    }
    if (req.file) doc.cover_image = `/public/uploads/${req.file.filename}`;
    else if (req.body.cover_image) doc.cover_image = req.body.cover_image;

    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};

/** ADMIN: toggle publish */
exports.togglePublish = async (req, res, next) => {
  try {
    const doc = await News.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    doc.is_published = !doc.is_published;
    doc.published_at = doc.is_published ? (doc.published_at || new Date()) : null;
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};

/** ADMIN: delete */
exports.remove = async (req, res, next) => {
  try {
    await News.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
};
