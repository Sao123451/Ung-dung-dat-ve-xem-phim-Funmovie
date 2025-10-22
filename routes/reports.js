// routes/reports.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controller/reportController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

router.get('/revenue', verifyToken, isAdmin, ctrl.revenueByDate);

module.exports = router;
