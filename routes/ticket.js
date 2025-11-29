// routes/tickets.js
const r = require('express').Router();
const t = require('../controller/ticketController');
const { verifyToken, requireRoles } = require('../middlewares/auth');

// CUSTOMER
r.get('/my', verifyToken, t.myTickets);
r.get('/:id', verifyToken, t.detail);
r.post('/', verifyToken, t.create);
r.patch('/:id/cancel', verifyToken, t.cancelMy);
r.get('/:id/qr', verifyToken, t.getQR);

// SEARCH BY RESERVATION CODE
r.get('/find/by-code/:code', verifyToken, t.findByCode);

// SEARCH BY QR DATA
r.get('/find/by-qr/:qr', verifyToken, t.findByQR);

// ADMIN / MANAGER / STAFF
r.get('/', verifyToken, requireRoles('admin','manager','staff'), t.list);
r.patch('/:id/status', verifyToken, requireRoles('admin','manager','staff'), t.updateStatus);
r.delete('/:id', verifyToken, requireRoles('admin','manager'), t.remove);
r.get('/:id/detailFull', verifyToken, t.detailFull);
r.post("/release-holding", verifyToken, t.releaseHoldingSeats);

module.exports = r;
