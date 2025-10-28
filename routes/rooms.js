// routes/rooms.js
const r = require('express').Router();
const c = require('../controller/roomController');
const { verifyToken, requireRoles } = require('../middlewares/auth');

// PUBLIC (Android)
r.get('/public', c.publicList);          // ?cinema=<id>&type=2D
r.get('/:id/public', c.publicDetail);

// ADMIN / MANAGER
r.get('/',        verifyToken, requireRoles('admin','manager'), c.list);
r.post('/',       verifyToken, requireRoles('admin','manager'), c.create);
r.put('/:id',     verifyToken, requireRoles('admin','manager'), c.update);
r.delete('/:id',  verifyToken, requireRoles('admin','manager'), c.remove);

module.exports = r;
