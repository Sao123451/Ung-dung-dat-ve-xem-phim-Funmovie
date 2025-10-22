// routes/payments.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controller/paymentController');
const { verifyToken, isStaff, isAdmin } = require('../middlewares/auth');

router.get('/', verifyToken, isStaff, ctrl.getPayments);
router.post('/', verifyToken, ctrl.createPayment);

module.exports = router;
