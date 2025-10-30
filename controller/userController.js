// controller/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) { next(err); }
};

exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) { next(err); }
};

/**
 * User tự cập nhật hồ sơ của chính mình (không cần admin)
 * Cho phép sửa: full_name, phone, email, avatar, birth_date
 */
exports.updateMe = async (req, res, next) => {
  try {
    const allowed = ['full_name', 'phone', 'email', 'avatar', 'birth_date'];
    const data = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: data },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Updated', user: updated });
  } catch (err) { next(err); }
};

/**
 * Cập nhật theo ID
 * - Chủ sở hữu được sửa các trường an toàn: full_name, phone, email, avatar, birth_date
 * - Admin được sửa mọi trường (trừ password — đổi mật khẩu nên qua endpoint riêng)
 */
exports.updateUser = async (req, res, next) => {
  try {
    const isOwner = String(req.user._id) === String(req.params.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const safeForUser = ['full_name', 'phone', 'email', 'avatar', 'birth_date'];
    let payload = {};

    if (isAdmin) {
      // Admin có thể cập nhật bất kỳ field nào ngoại trừ password (để tránh rủi ro)
      const { password, ...others } = req.body || {};
      payload = others;
    } else {
      for (const k of safeForUser) {
        if (req.body[k] !== undefined) payload[k] = req.body[k];
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Updated', user: updated });
  } catch (err) { next(err); }
};

/**
 * Admin/Manager tạo tài khoản nhân sự
 * Hỗ trợ birth_date khi khởi tạo
 */
exports.adminCreateUser = async (req, res, next) => {
  try {
    const { username, email, password, full_name, phone, role = 'staff', avatar, birth_date } = req.body;

    const allowed = ['staff','manager','admin','customer'];
    if (!allowed.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can create admin' });
    }

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(400).json({ message: 'Username or email already used' });

    const hashed = await bcrypt.hash(password || '12345678', 10);
    const created = await User.create({
      username,
      email,
      password: hashed,
      full_name,
      phone,
      role,
      avatar,
      birth_date
    });

    res.status(201).json({
      message: 'User created',
      user: {
        id: created._id,
        username: created.username,
        email: created.email,
        role: created.role
      }
    });
  } catch (err) { next(err); }
};
