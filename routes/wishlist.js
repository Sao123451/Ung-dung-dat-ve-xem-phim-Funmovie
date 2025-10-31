// routes/wishlist.js
const r = require('express').Router();
const c = require('../controller/wishlistController');
const { verifyToken } = require('../middlewares/auth');

// CUSTOMER: phải đăng nhập
r.get('/my', verifyToken, c.myList);
r.get('/is-faved', verifyToken, c.isFaved);
r.post('/', verifyToken, c.add);
r.post('/toggle', verifyToken, c.toggle);
r.delete('/movie/:movieId', verifyToken, c.removeByMovie);
r.delete('/clear', verifyToken, c.clearMine);

module.exports = r;
