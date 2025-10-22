// routes/auth.js
const express = require('express');
const router = express.Router();
const auth = require('../controller/authController');

router.post('/register', auth.register);
router.post('/login', auth.login);

module.exports = router;
