const r = require('express').Router();
const c = require('../controller/paymentController');
const { verifyToken } = require('../middlewares/auth');

r.post('/init', verifyToken, c.init);
r.post('/:id/mark', c.mark);

module.exports = r;
