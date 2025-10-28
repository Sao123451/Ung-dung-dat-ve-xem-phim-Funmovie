// routes/tickets.js
const r = require('express').Router();
const t = require('../controller/ticketController');
const { verifyToken, requireRoles } = require('../middlewares/auth');

// CUSTOMER (phải đăng nhập)
r.get('/my', verifyToken, t.myTickets);
r.get('/:id', verifyToken, t.detail);
r.post('/', verifyToken, t.create);
r.patch('/:id/cancel', verifyToken, t.cancelMy);
r.get('/:id/qr', verifyToken, t.getQR);

// ADMIN / MANAGER / STAFF
r.get('/', verifyToken, requireRoles('admin','manager','staff'), t.list);
r.patch('/:id/status', verifyToken, requireRoles('admin','manager','staff'), t.updateStatus);
r.delete('/:id', verifyToken, requireRoles('admin','manager'), t.remove);

module.exports = r;
