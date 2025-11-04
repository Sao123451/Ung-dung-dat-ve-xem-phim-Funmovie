// routes/products.js
const r = require('express').Router();
const c = require('../controller/productController');
const { verifyToken, requireRoles } = require('../middlewares/auth');

// PUBLIC
r.get('/public', c.publicList);

// ADMIN
r.get('/', verifyToken, requireRoles('admin','manager','staff'), c.adminList);
r.post('/', verifyToken, requireRoles('admin','manager','staff'), c.create);
r.put('/:id', verifyToken, requireRoles('admin','manager','staff'), c.update);
r.delete('/:id', verifyToken, requireRoles('admin','manager','staff'), c.remove);

module.exports = r;
