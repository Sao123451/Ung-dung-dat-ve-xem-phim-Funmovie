const express = require('express');
const router = express.Router();

// ⚠ Kiểm tra đúng đường dẫn thư mục "controller"
const auth = require('../controller/authController');

// REGISTER — auto send OTP + verify OTP
router.post('/register', auth.register);

// LOGIN
router.post('/login', auth.login);

// CHANGE PASSWORD WITH OTP
router.post('/password/change-otp', auth.changePasswordWithOtp);

// STAFF LOGIN
router.post('/staff/login', auth.staffLogin);

// STAFF REGISTER
router.post('/staff/register', auth.staffRegister);

module.exports = router;
