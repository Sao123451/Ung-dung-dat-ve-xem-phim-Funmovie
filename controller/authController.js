// controller/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res, next) => {
  try {
    const { username, email, password, full_name, phone } = req.body;
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(400).json({ message: 'Username or email already used' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed, full_name, phone });
    res.status(201).json({ message: 'Registered', user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const user = await User.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
    res.json({ message: 'Login success', token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (err) { next(err); }
};
