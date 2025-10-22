// routes/vouchers.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controller/voucherController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

router.post('/', verifyToken, isAdmin, ctrl.createVoucher);
router.get('/:code/validate', ctrl.validateVoucher);

module.exports = router;
