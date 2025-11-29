const express = require('express');
const router = express.Router();

const ctrl = require('../controller/voucherController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

// PUBLIC
router.get('/public', ctrl.publicList);
router.get('/:code/validate', ctrl.validateVoucher);

// ADMIN
router.post('/', verifyToken, isAdmin, ctrl.createVoucher);
router.put('/:id', verifyToken, isAdmin, ctrl.updateVoucher);
router.delete('/:id', verifyToken, isAdmin, ctrl.removeVoucher);

// USER
router.post('/add', verifyToken, ctrl.addUserVoucher);
router.get('/my', verifyToken, ctrl.myVouchers);
router.put('/use/:id', verifyToken, ctrl.useVoucher);

module.exports = router;
