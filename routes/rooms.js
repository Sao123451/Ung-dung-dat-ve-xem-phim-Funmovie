// routes/rooms.js
const r = require('express').Router();
const c = require('../controller/roomController');
const { verifyToken, requireRoles } = require('../middlewares/auth');

// PUBLIC
r.get('/public', c.publicList);
r.get('/:id/public', c.publicDetail);

// ADMIN/MANAGER
r.get('/', verifyToken, requireRoles('admin','manager','staff'), c.list);
r.post('/', verifyToken, requireRoles('admin','manager'), c.create);
r.put('/:id', verifyToken, requireRoles('admin','manager'), c.update);
r.post('/:id/regenerate-seats', verifyToken, requireRoles('admin','manager'), c.regenerateSeats);
r.delete('/:id', verifyToken, requireRoles('admin','manager'), c.remove);

module.exports = r;
