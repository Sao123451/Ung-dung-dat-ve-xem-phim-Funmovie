// routes/auditLogs.js
const express = require('express');
const router = express.Router();

const auditLogCtrl = require('../controller/auditLogController');
// ⭐ DÙNG CHUNG auth middleware NHƯ routes/users.js
const { verifyToken } = require('../middlewares/auth');

// Lịch sử hoạt động của CHÍNH tài khoản đang đăng nhập
router.get('/my', verifyToken, auditLogCtrl.myLogs);

module.exports = router;
