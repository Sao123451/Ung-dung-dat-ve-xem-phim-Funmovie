// routes/users.js
const express = require('express');
const router = express.Router();
const userCtrl = require('../controller/userController');
const { verifyToken, isAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Hồ sơ của chính mình
router.get('/me', verifyToken, userCtrl.getProfile);
router.put('/me', verifyToken, upload.single('avatar'), userCtrl.updateMe);

// Admin xem danh sách
router.get('/', verifyToken, isAdmin, userCtrl.listUsers);

// Cập nhật theo ID: cho phép nếu là chủ sở hữu hoặc admin
router.put('/:id', verifyToken, userCtrl.updateUser);

// Admin/manager tạo tài khoản nhân sự
router.post('/admin-create', verifyToken, isAdmin, userCtrl.adminCreateUser);

router.put('/me/change-password', verifyToken, userCtrl.changeMyPassword);


module.exports = router;
