// controller/newsController.js
const News = require('../models/News');

const isId = v => /^[0-9a-fA-F]{24}$/.test(String(v || '').trim());
const baseUrl = (req) =>
  (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`)
    .replace(/\/+$/,'');
const toAbs = (req, u) =>
  /^https?:\/\//i.test(u) ? u : `${baseUrl(req)}${u.startsWith('/') ? '' : '/'}${u}`;

/* ===========================
   PUBLIC: List
=========================== */
exports.publicList = async (req, res, next) => {
  try {
    const { q, tag, category, page = 1, limit = 10 } = req.query;

    const filter = { is_published: true };

    // ⭐ FILTER THEO LOẠI NEWS / PROMOTION
    if (category) filter.category = category;

    if (tag) filter.tags = tag.toLowerCase();
    if (q) filter.$text = { $search: q };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      News.find(filter)
        .sort({ published_at: -1, createdAt: -1 })
        .skip(skip).limit(Number(limit))
        .select('-__v'),
      News.countDocuments(filter)
    ]);

    const data = items.map(n => ({
      ...n.toObject(),
      cover_image: n.cover_image ? toAbs(req, n.cover_image) : ''
    }));

    res.json({ items: data, total, page: Number(page), limit: Number(limit) });
  } catch (e) { next(e); }
};

/* ===========================
   PUBLIC: Detail
=========================== */
exports.publicDetail = async (req, res, next) => {
  try {
    const key = req.params.idOrSlug;
    const filter = isId(key)
      ? { _id: key, is_published: true }
      : { slug: key, is_published: true };

    const doc = await News.findOneAndUpdate(
      filter,
      { $inc: { view_count: 1 } },
      { new: true }
    );

    if (!doc) return res.status(404).json({ message: 'Not found' });

    const obj = doc.toObject();
    obj.cover_image = obj.cover_image ? toAbs(req, obj.cover_image) : '';

    res.json(obj);
  } catch (e) { next(e); }
};

/* ===========================
   ADMIN LIST
=========================== */
exports.list = async (req, res, next) => {
  try {
    const { q, tag, category, is_published, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (typeof is_published !== 'undefined')
      filter.is_published = is_published === 'true';
    if (tag) filter.tags = tag.toLowerCase();
    if (q) filter.$text = { $search: q };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      News.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      News.countDocuments(filter)
    ]);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (e) { next(e); }
};

/* ===========================
   ADMIN DETAIL
=========================== */
exports.detail = async (req, res, next) => {
  try {
    const doc = await News.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

/* ===========================
   ADMIN CREATE
=========================== */
exports.create = async (req, res, next) => {
  try {
    const payload = {
      title: req.body.title,
      slug: req.body.slug,
      content: req.body.content,
      excerpt: req.body.excerpt || '',
      category: req.body.category || 'news',   // ⭐ NEW
      tags: Array.isArray(req.body.tags)
        ? req.body.tags
        : (req.body.tags ? String(req.body.tags).split(',') : []),
      is_published: !!req.body.is_published,
      published_at: req.body.is_published ? (req.body.published_at || new Date()) : null,
      author: req.user?._id || null
    };

    if (req.file) payload.cover_image = `/public/uploads/${req.file.filename}`;
    else if (req.body.cover_image) payload.cover_image = req.body.cover_image;

    const doc = await News.create(payload);

    // ⭐ AUDIT: tạo bài viết
    req.auditAction  = 'news.create';
    req.auditSummary = `Tạo bài viết: ${doc.title || '(không tiêu đề)'}`;
    req.auditTarget  = {
      type: 'News',
      id:   doc._id,
      name: doc.title
    };

    res.status(201).json(doc);
  } catch (e) { next(e); }
};

/* ===========================
   ADMIN UPDATE
=========================== */
exports.update = async (req, res, next) => {
  try {
    const doc = await News.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    if (req.body.title) doc.title = req.body.title;
    if (req.body.slug) doc.slug = req.body.slug;
    if (req.body.content) doc.content = req.body.content;
    if (req.body.excerpt) doc.excerpt = req.body.excerpt;

    if (typeof req.body.category !== 'undefined')
      doc.category = req.body.category; // ⭐ NEW

    if (typeof req.body.is_published !== 'undefined')
      doc.is_published = !!req.body.is_published;

    if (typeof req.body.published_at !== 'undefined')
      doc.published_at = req.body.published_at || null;

    if (typeof req.body.tags !== 'undefined') {
      doc.tags = Array.isArray(req.body.tags)
        ? req.body.tags
        : String(req.body.tags).split(',');
    }

    if (req.file) doc.cover_image = `/public/uploads/${req.file.filename}`;
    else if (req.body.cover_image) doc.cover_image = req.body.cover_image;

    await doc.save();

    // ⭐ AUDIT: cập nhật bài viết
    req.auditAction  = 'news.update';
    req.auditSummary = `Cập nhật bài viết: ${doc.title || '(không tiêu đề)'}`;
    req.auditTarget  = {
      type: 'News',
      id:   doc._id,
      name: doc.title
    };

    res.json(doc);
  } catch (e) { next(e); }
};

/* ===========================
   ADMIN TOGGLE PUBLISH
=========================== */
exports.togglePublish = async (req, res, next) => {
  try {
    const doc = await News.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    doc.is_published = !doc.is_published;
    doc.published_at = doc.is_published ? (doc.published_at || new Date()) : null;

    await doc.save();

    // ⭐ AUDIT: publish / unpublish
    const action = doc.is_published ? 'news.publish' : 'news.unpublish';
    const state  = doc.is_published ? 'đã xuất bản' : 'nháp';

    req.auditAction  = action;
    req.auditSummary = `Đổi trạng thái bài viết: ${doc.title || '(không tiêu đề)'} → ${state}`;
    req.auditTarget  = {
      type: 'News',
      id:   doc._id,
      name: doc.title
    };

    res.json(doc);
  } catch (e) { next(e); }
};

/* ===========================
   ADMIN DELETE
=========================== */
exports.remove = async (req, res, next) => {
  try {
    const deleted = await News.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });


     // ⭐ AUDIT: xóa bài viết
    req.auditAction  = 'news.delete';
    req.auditSummary = `Xóa bài viết: ${deleted.title || '(không tiêu đề)'}`;
    req.auditTarget  = {
      type: 'News',
      id:   deleted._id,
      name: deleted.title
    };

    res.json({ ok: true });
  } catch (e) { next(e); }
};
