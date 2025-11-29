// controller/bannerController.js
const mongoose = require('mongoose');
const Banner = require('../models/Banner');
const BannerImage = require('../models/BannerImage');

const baseUrl = (req) =>
  (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/,'');
const toAbs = (base, u) => (/^https?:\/\//i.test(u) ? u : `${base}${u.startsWith('/') ? '' : '/'}${u}`);
const shuffle = (arr) => { for (let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];} return arr; };

/** PUBLIC: ảnh của 1 banner (xoay vòng) */
exports.publicImagesByBanner = async (req, res, next) => {
  try {
    const { bannerId } = req.params;
    const withLink = String(req.query.withLink || 'false').toLowerCase() === 'true';
    if (!mongoose.isValidObjectId(bannerId)) return res.status(400).json({ message: 'Invalid banner id' });

    const banner = await Banner.findOne({ _id: bannerId, is_active: true }).lean();
    if (!banner) return res.status(404).json({ message: 'Banner not found or inactive' });

    const imgs = await BannerImage.find({ banner_id: banner._id })
      .select('image_url movie_id updatedAt')
      .lean();

    res.set('Cache-Control','public, max-age=60');

    const base = baseUrl(req);
    const data = shuffle(imgs).map(x => ({
      image_url: toAbs(base, x.image_url),
      movie_id: x.movie_id || null
    }));

    if (!withLink) return res.json(data);
    return res.json({ link_url: banner.link_url || '', images: data });
  } catch (e) { next(e); }
};

/** ADMIN: list banners + image_count */
exports.list = async (req, res, next) => {
  try {
    const items = await Banner.aggregate([
      { $sort: { createdAt: -1 } },
      { $lookup: {
        from: 'bannerimages',
        localField: '_id',
        foreignField: 'banner_id',
        pipeline: [{ $count: 'count' }],
        as: 'imgs'
      }},
      { $addFields: { image_count: { $ifNull: [{ $arrayElemAt: ['$imgs.count',0] }, 0] } } },
      { $project: { imgs: 0 } }
    ]);
    res.json(items);
  } catch (e) { next(e); }
};

/** ADMIN: create banner (rỗng, chưa có ảnh) */
exports.create = async (req, res, next) => {
  try {
    const b = await Banner.create({
      title: req.body.title,
      link_url: req.body.link_url || '',
      is_active: typeof req.body.is_active !== 'undefined' ? !!req.body.is_active : true
    });

    // ⭐ AUDIT
    req.auditAction = 'banner.create';
    req.auditSummary = `Tạo banner mới: ${b.title || '(không tiêu đề)'}`;
    req.auditTarget = {
      type: 'Banner',
      id: b._id,
      name: b.title,
    };

    res.status(201).json(b);
  } catch (e) { next(e); }
};

/** ADMIN: toggle active */
exports.toggle = async (req, res, next) => {
  try {
    const b = await Banner.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Not found' });
    b.is_active = !b.is_active;
    await b.save();

    // ⭐ AUDIT
    req.auditAction = 'banner.toggle';
    req.auditSummary = `${b.is_active ? 'Bật' : 'Tắt'} banner: ${
      b.title || '(không tiêu đề)'
    }`;
    req.auditTarget = {
      type: 'Banner',
      id: b._id,
      name: b.title,
    };

    res.json(b);
  } catch (e) { next(e); }
};

/** ADMIN: update title/link/is_active */
exports.update = async (req, res, next) => {
  try {
    const b = await Banner.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Not found' });

    if (typeof req.body.title !== 'undefined') b.title = req.body.title;
    if (typeof req.body.link_url !== 'undefined') b.link_url = req.body.link_url;
    if (typeof req.body.is_active !== 'undefined') b.is_active = !!req.body.is_active;

    await b.save();

    // ⭐ AUDIT
    req.auditAction = 'banner.update';
    req.auditSummary = `Cập nhật banner: ${b.title || '(không tiêu đề)'}`;
    req.auditTarget = {
      type: 'Banner',
      id: b._id,
      name: b.title,
    };

    res.json(b);
  } catch (e) { next(e); }
};

/** ADMIN: add images (upload nhiều ảnh) */
exports.addImages = async (req, res, next) => {
  try {
    const b = await Banner.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Banner not found' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No images uploaded (images[])' });

    const docs = req.files.map(f => ({ banner_id: b._id, image_url: `/public/uploads/${f.filename}` }));
    const created = await BannerImage.insertMany(docs);

    // ⭐ AUDIT
    req.auditAction = 'banner.addImages';
    req.auditSummary = `Thêm ${created.length} ảnh cho banner: ${
      b.title || '(không tiêu đề)'
    }`;
    req.auditTarget = {
      type: 'Banner',
      id: b._id,
      name: b.title,
    };

    res.status(201).json({ ok: true, added: created.length });
  } catch (e) { next(e); }
};

/** ADMIN: remove one image */
exports.removeImage = async (req, res, next) => {
  try {
    const img = await BannerImage.findOne({ _id: req.params.imageId, banner_id: req.params.id });
    if (!img) return res.status(404).json({ message: 'Image not found' });
    await BannerImage.deleteOne({ _id: img._id });

    // ⭐ AUDIT
    req.auditAction = 'banner.removeImage';
    req.auditSummary = `Xóa 1 ảnh khỏi banner ${req.params.id} (imageId=${img._id})`;
    req.auditTarget = {
      type: 'BannerImage',
      id: img._id,
      name: img.image_url,
    };

    res.json({ ok: true });
  } catch (e) { next(e); }
};

/** ADMIN: delete banner + all images */
exports.remove = async (req, res, next) => {
  try {
    const b = await Banner.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Banner not found' });
    await BannerImage.deleteMany({ banner_id: b._id });
    await Banner.deleteOne({ _id: b._id });

     // ⭐ AUDIT
    req.auditAction = 'banner.delete';
    req.auditSummary = `Xóa banner: ${b.title || '(không tiêu đề)'}`;
    req.auditTarget = {
      type: 'Banner',
      id: b._id,
      name: b.title,
    };

    res.json({ ok: true });
  } catch (e) { next(e); }
};

exports.publicAll = async (req, res, next) => {
  try {
    const banners = await Banner.find({ is_active: true }).sort({ createdAt: -1 }).lean();
    const base = baseUrl(req);

    const result = [];
    for (const b of banners) {
      const imgs = await BannerImage.find({ banner_id: b._id }).select('image_url movie_id').lean();
      result.push({
        _id: b._id,
        title: b.title,
        link_url: b.link_url,
        images: imgs.map(i => ({
          image_url: toAbs(base, i.image_url),
          movie_id: i.movie_id || null
        }))
      });
    }
    res.json(result);
  } catch (e) { next(e); }
};

exports.updateImageMeta = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(imageId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const img = await BannerImage.findOne({ _id: imageId, banner_id: id });
    if (!img) return res.status(404).json({ message: 'Image not found' });

    // body: { movie_id: "<ObjectId>|null" }
    if (typeof req.body.movie_id !== 'undefined') {
      img.movie_id = req.body.movie_id ? new mongoose.Types.ObjectId(req.body.movie_id) : null;
    }
    await img.save();

    // ⭐ AUDIT
    req.auditAction = 'bannerImage.updateMeta';
    req.auditSummary = `Cập nhật movie cho ảnh banner (imageId=${img._id})`;
    req.auditTarget = {
      type: 'BannerImage',
      id: img._id,
      name: img.image_url,
    };

    res.json(img);
  } catch (e) { next(e); }
};



// An sửa
// ADMIN: lấy ảnh theo banner (bao gồm cả _id)
exports.adminImagesByBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid banner id' });
    }

    const banner = await Banner.findById(id).lean();
    if (!banner) return res.status(404).json({ message: 'Banner not found' });

    const imgs = await BannerImage.find({ banner_id: id })
      .select('_id image_url movie_id updatedAt')
      .lean();

    const base = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/,'');
    const data = imgs.map(x => ({
      _id: x._id,
      image_url: /^https?:\/\//i.test(x.image_url) ? x.image_url : `${base}${x.image_url.startsWith('/') ? '' : '/'}${x.image_url}`,
      movie_id: x.movie_id || null,
      updatedAt: x.updatedAt
    }));

    res.json({ banner: { _id: banner._id, title: banner.title, is_active: banner.is_active }, images: data });
  } catch (e) { next(e); }
};

