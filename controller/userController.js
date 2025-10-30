// controller/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs'); // bạn đang dùng bcrypt ở adminCreateUser rồi

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

// ====== NEW: user tự update hồ sơ của mình ======
exports.updateMe = async (req, res, next) => {
  try {
    // CHỈ cho sửa các trường an toàn (tránh đổi role/status/username)
    const allowed = ['full_name','phone','email','avatar'];
    const data = {};
    for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: data },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Updated', user: updated });
  } catch (err) { next(err); }
};

// (Giữ nguyên logic cũ nhưng đổi tên để rõ ràng): Admin cập nhật bất kỳ ai
exports.adminUpdateUser = async (req, res, next) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ message: 'Updated', user: updated });
  } catch (err) { next(err); }
};

// (Giữ nguyên) Admin/Manager tạo tài khoản nhân sự
exports.adminCreateUser = async (req, res, next) => {
  try {
    const { username, email, password, full_name, phone, role = 'staff' } = req.body;
    const allowed = ['staff','manager','admin','customer'];
    if (!allowed.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can create admin' });
    }

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(400).json({ message: 'Username or email already used' });

    const hashed = await bcrypt.hash(password || '12345678', 10);
    const created = await User.create({ username, email, password: hashed, full_name, phone, role });
    res.status(201).json({
      message: 'User created',
      user: { id: created._id, username: created.username, email: created.email, role: created.role }
    });
  } catch (err) { next(err); }
};
