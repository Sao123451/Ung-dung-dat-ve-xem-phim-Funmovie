// routes/auth.js
const express = require('express');
const router = express.Router();
const auth = require('../controller/authController');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/staff/login', auth.staffLogin);
router.post('/staff/register', auth.staffRegister);

module.exports = router;
