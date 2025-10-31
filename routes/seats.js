// routes/seats.js
const r = require('express').Router();
const c = require('../controller/seatController');  // đúng path tới controller
const { verifyToken, requireRoles } = require('../middlewares/auth');

// ===== PUBLIC (Android) =====
r.get('/public',      c.publicByRoom);   // ?room=<roomId>&mode=grid|list
r.get('/:id/public',  c.publicDetail);

// ===== ADMIN / MANAGER =====
r.get('/',              verifyToken, requireRoles('admin','manager'), c.list);
r.post('/',             verifyToken, requireRoles('admin','manager'), c.create);
r.post('/bulk',         verifyToken, requireRoles('admin','manager'), c.bulkCreate);
r.put('/:id',           verifyToken, requireRoles('admin','manager'), c.update);
r.patch('/:id/status',  verifyToken, requireRoles('admin','manager'), c.updateStatus);
r.delete('/:id',        verifyToken, requireRoles('admin','manager'), c.remove);
r.delete('/clear',      verifyToken, requireRoles('admin','manager'), c.clearByRoom);

module.exports = r;
