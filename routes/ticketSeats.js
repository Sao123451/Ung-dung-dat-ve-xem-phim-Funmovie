// routes/ticketSeats.js
const r = require('express').Router();
const c = require('../controller/ticketSeatController');
const { verifyToken, requireRoles } = require('../middlewares/auth');

// CUSTOMER/ADMIN: xem ghế theo ticket (phải đăng nhập)
r.get('/by-ticket/:ticketId', verifyToken, c.byTicket);

// ADMIN list & lọc
r.get('/', verifyToken, requireRoles('admin','manager','staff'), c.list);

// OWNER (ticket) hoặc ADMIN tạo ghế hàng loạt
r.post('/bulk', verifyToken, c.bulkCreate);

// ADMIN/STAFF cập nhật trạng thái từng ghế
r.patch('/:id/status', verifyToken, requireRoles('admin','manager','staff'), c.updateStatus);

// OWNER hoặc ADMIN xoá ghế khỏi ticket
r.delete('/:id', verifyToken, c.remove);


module.exports = r;
