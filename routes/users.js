// routes/users.js
const express = require('express');
const router = express.Router();
const userCtrl = require('../controller/userController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

router.get('/me', verifyToken, userCtrl.getProfile);
router.get('/', verifyToken, isAdmin, userCtrl.listUsers);
router.put('/:id', verifyToken, isAdmin, userCtrl.updateUser);

module.exports = router;
