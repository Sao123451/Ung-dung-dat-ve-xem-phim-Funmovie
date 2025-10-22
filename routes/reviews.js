// routes/reviews.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controller/reviewController');
const { verifyToken } = require('../middlewares/auth');

router.post('/', verifyToken, ctrl.createReview);
router.get('/movie/:movieId', ctrl.getByMovie);

module.exports = router;
