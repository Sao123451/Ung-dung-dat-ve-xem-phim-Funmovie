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

//An ✅ NEW: lấy tất cả ảnh của 1 banner, có _id để thao tác
r.get('/:id/images', verifyToken, requireRoles('admin', 'manager'), c.adminImagesByBanner);

// NEW: gán/chỉnh movie_id cho 1 ảnh
r.patch('/:id/images/:imageId', verifyToken, requireRoles('admin', 'manager'), c.updateImageMeta);

//An ✅ NEW: XOÁ 1 ảnh trong banner (bổ sung route còn thiếu)
r.delete('/:id/images/:imageId', verifyToken, requireRoles('admin', 'manager'), c.removeImage);

r.delete('/:id', verifyToken, requireRoles('admin', 'manager'), c.remove);

module.exports = r;
