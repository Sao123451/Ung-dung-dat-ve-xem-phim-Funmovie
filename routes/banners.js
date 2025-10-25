// routes/banners.js
const r = require('express').Router();
const upload = require('../middlewares/upload');
const c = require('../controller/bannerController');
const { verifyToken, requireRoles } = require('../middlewares/auth');

// PUBLIC
r.get('/public/all', c.publicAll);
r.get('/:bannerId/public', c.publicImagesByBanner);

// ADMIN/MANAGER
r.get('/', verifyToken, requireRoles('admin', 'manager'), c.list);
r.post('/', verifyToken, requireRoles('admin', 'manager'), c.create);
r.put('/:id', verifyToken, requireRoles('admin', 'manager'), c.update);
r.patch('/:id/toggle', verifyToken, requireRoles('admin', 'manager'), c.toggle);
r.post('/:id/images', verifyToken, requireRoles('admin', 'manager'), upload.array('images', 12), c.addImages);

// NEW: gán/chỉnh movie_id cho 1 ảnh
r.patch('/:id/images/:imageId', verifyToken, requireRoles('admin', 'manager'), c.updateImageMeta);

r.delete('/:id', verifyToken, requireRoles('admin', 'manager'), c.remove);

module.exports = r;
