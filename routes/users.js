// routes/users.js
const express = require('express');
const router = express.Router();
const userCtrl = require('../controller/userController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

router.get('/me', verifyToken, userCtrl.getProfile);

// NEW: user tự cập nhật chính mình (KHÔNG cần admin)
router.put('/me', verifyToken, userCtrl.updateMe);

// Admin xem danh sách
router.get('/', verifyToken, isAdmin, userCtrl.listUsers);

// Admin cập nhật bất kỳ ai
router.put('/:id', verifyToken, isAdmin, userCtrl.adminUpdateUser);

module.exports = router;
