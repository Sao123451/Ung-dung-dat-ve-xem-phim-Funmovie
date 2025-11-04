const express = require('express');
const router = express.Router();

const ctrl = require('../controller/voucherController'); // đúng thư mục: controller (không phải controllers)

//
// THỨ TỰ ROUTE: đặt /public trước /:code để tránh nuốt route
//
router.get('/public', ctrl.publicList);             // public list
router.get('/:code/validate', ctrl.validateVoucher);// validate theo code

// ADMIN
const { verifyToken, isAdmin } = require('../middlewares/auth');
router.post('/', verifyToken, isAdmin, ctrl.createVoucher);

module.exports = router;
