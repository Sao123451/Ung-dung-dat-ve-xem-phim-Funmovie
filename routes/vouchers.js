const express = require('express');
const router = express.Router();

const ctrl = require('../controller/voucherController');

router.get('/public', ctrl.publicList);
router.get('/:code/validate', ctrl.validateVoucher);

// ADMIN
const { verifyToken, isAdmin } = require('../middlewares/auth');

router.post('/', verifyToken, isAdmin, ctrl.createVoucher);
router.put('/:id', verifyToken, isAdmin, ctrl.updateVoucher);
router.delete('/:id', verifyToken, isAdmin, ctrl.removeVoucher);

module.exports = router;