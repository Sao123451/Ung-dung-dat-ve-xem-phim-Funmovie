// routes/bookings.js
const r = require('express').Router();
const c = require('../controller/bookingController');
const { verifyToken } = require('../middlewares/auth');

// TÍNH GIÁ (không cần đăng nhập)
r.post('/quote', c.quote);

// TẠO VÉ (giữ ghế) — cần đăng nhập
r.post('/', verifyToken, c.create);

// XÁC NHẬN THANH TOÁN — cần đăng nhập
r.post('/:id/confirm', verifyToken, c.confirm);

r.get('/:id', verifyToken, c.detail);
r.post('/:id/cancel', verifyToken, c.cancel);


module.exports = r;
