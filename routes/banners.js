// routes/banners.js
const r = require('express').Router();
const upload = require('../middlewares/upload');
const c = require('../controller/bannerController');
const { verifyToken, requireRoles } = require('../middlewares/auth');


r.get('/:bannerId/public', c.publicImagesByBanner);
r.get('/public/all', c.publicAll);

r.get('/', verifyToken, requireRoles('admin', 'manager'), c.list);
r.post('/', verifyToken, requireRoles('admin', 'manager'), c.create);
r.put('/:id', verifyToken, requireRoles('admin', 'manager'), c.update);
r.patch('/:id/toggle', verifyToken, requireRoles('admin', 'manager'), c.toggle);
r.post('/:id/images', verifyToken, requireRoles('admin', 'manager'), upload.array('images', 12), c.addImages);
r.delete('/:id', verifyToken, requireRoles('admin', 'manager'), c.remove);

module.exports = r;
