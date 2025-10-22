// middlewares/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getTokenFromHeader = (req) => {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const parts = h.split(' ');
  return parts.length === 2 ? parts[1] : null;
};

exports.verifyToken = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    const user = await User.findById(payload.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};

exports.isAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

exports.isStaff = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.user.role !== 'staff' && req.user.role !== 'admin') return res.status(403).json({ message: 'Staff access required' });
  next();
};
