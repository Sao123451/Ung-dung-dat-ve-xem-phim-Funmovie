// routes/news.js
const r = require('express').Router();
const c = require('../controller/newsController');
const { verifyToken, requireRoles } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// PUBLIC (Android/Web)
r.get('/public', c.publicList);                    // ?q=&tag=&page=&limit=
r.get('/public/:idOrSlug', c.publicDetail);        // id hoặc slug

// ADMIN/MANAGER
r.get('/', verifyToken, requireRoles('admin','manager'), c.list);
r.get('/:id', verifyToken, requireRoles('admin','manager'), c.detail);
r.post('/', verifyToken, requireRoles('admin','manager'), upload.single('cover'), c.create);
r.put('/:id', verifyToken, requireRoles('admin','manager'), upload.single('cover'), c.update);
r.patch('/:id/publish', verifyToken, requireRoles('admin','manager'), c.togglePublish);
r.delete('/:id', verifyToken, requireRoles('admin','manager'), c.remove);

module.exports = r;
