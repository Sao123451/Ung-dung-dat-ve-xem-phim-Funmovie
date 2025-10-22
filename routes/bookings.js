// routes/bookings.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controller/bookingController');
const { verifyToken } = require('../middlewares/auth');

router.post('/', verifyToken, ctrl.createBooking);
router.get('/user/:userId', verifyToken, ctrl.getByUser);

module.exports = router;
