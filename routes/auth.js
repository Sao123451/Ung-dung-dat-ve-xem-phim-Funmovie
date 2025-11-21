// routes/auth.js
const express = require('express');
const router = express.Router();
const auth = require('../controller/authController');

/* ============================================================
   📌 AUTH CUSTOMER
============================================================ */

// Đăng ký (2 bước: gửi OTP → verify OTP → tạo user)
router.post('/register', auth.register);

// Login (username/email)
router.post('/login', auth.login);

// QUÊN MẬT KHẨU bằng OTP (3 bước)
router.post('/password/forgot', auth.forgotPassword);

// Đổi mật khẩu bằng OTP (auto verify)
router.post('/password/change-otp', auth.changePasswordWithOtp);


/* ============================================================
   📌 AUTH STAFF
============================================================ */

// Staff login
router.post('/staff/login', auth.staffLogin);

// Staff register
router.post('/staff/register', auth.staffRegister);


module.exports = router;
