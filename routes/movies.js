// routes/movies.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controller/movieController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

// public
router.get('/', ctrl.getAll);

router.get('/coming', ctrl.getComing);           
router.get('/now-showing', ctrl.getNowShowing); 
router.get('/archived', ctrl.getArchived); 

router.get('/:id', ctrl.getById);

// admin
router.post('/', verifyToken, isAdmin, ctrl.create);
router.put('/:id', verifyToken, isAdmin, ctrl.update);
router.delete('/:id', verifyToken, isAdmin, ctrl.delete);

module.exports = router;
