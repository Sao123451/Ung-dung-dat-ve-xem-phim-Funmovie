// routes/showtimes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controller/showtimeController');
const { verifyToken, isAdmin, isStaff } = require('../middlewares/auth');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

// Admin/Staff
router.post('/', verifyToken, isStaff, ctrl.create);
router.put('/:id', verifyToken, isStaff, ctrl.update);
router.delete('/:id', verifyToken, isAdmin, ctrl.delete);

module.exports = router;
