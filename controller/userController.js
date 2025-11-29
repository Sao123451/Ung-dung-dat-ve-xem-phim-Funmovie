// controller/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ====================== PROFILE ======================
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('cinema');
    res.json(user);
  } catch (err) { next(err); }
};

exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('cinema');
    res.json(users);
  } catch (err) { next(err); }
};

// ====================== CHANGE PASSWORD ======================
exports.changeMyPassword = async (req, res, next) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password)
      return res.status(400).json({ message: 'Thiếu mật khẩu cũ hoặc mới' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User không tồn tại' });

    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });

    user.password = await bcrypt.hash(new_password, 10);
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) { next(err); }
};

// ====================== UPDATE ME ======================
exports.updateMe = async (req, res, next) => {
  try {
    const allowed = ['full_name', 'phone', 'email', 'birth_date'];
    const data = {};

    if (req.file) data.avatar = `/public/uploads/${req.file.filename}`;

    for (const k of allowed) {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('cinema');

    res.json({ message: 'Updated', user: updated });
  } catch (err) { next(err); }
};

// ====================== UPDATE BY ID ======================
exports.updateUser = async (req, res, next) => {
  try {
    const isOwner = String(req.user._id) === String(req.params.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: 'Forbidden' });

    const safeForUser = ['full_name', 'phone', 'email', 'avatar', 'birth_date'];
    let payload = {};

    if (isAdmin) {
      // Admin có quyền sửa mọi trường, trừ password
      const { password, ...rest } = req.body;
      payload = rest;
    } else {
      safeForUser.forEach(k => {
        if (req.body[k] !== undefined) payload[k] = req.body[k];
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true }
    )
      .select('-password')
      .populate('cinema');

       // ⭐ AUDIT LOG — admin hoặc user cập nhật user theo id
    if (updated) {
      const changedFields = Object.keys(payload);
      req.auditAction  = 'user.update';
      req.auditSummary = isAdmin
        ? `Admin ${req.user.username || req.user.email} cập nhật user ${updated.username || updated.email} (trường: ${changedFields.join(', ') || 'không rõ'})`
        : `User ${updated.username || updated.email} tự cập nhật thông tin của mình qua /users/:id (trường: ${changedFields.join(', ') || 'không rõ'})`;
      req.auditTarget  = {
        type: 'User',
        id:   updated._id,
        name: updated.username || updated.email
      };
    }

    res.json({ message: 'Updated', user: updated });
  } catch (err) { next(err); }
};

// ====================== ADMIN CREATE USER (STAFF/MANAGER) ======================
exports.adminCreateUser = async (req, res, next) => {
  try {
    const { 
      username, email, password, full_name, phone, 
      role = 'staff', avatar, birth_date, cinema 
    } = req.body;

    // Validate role
    const allowed = ['staff', 'manager', 'admin', 'customer'];
    if (!allowed.includes(role))
      return res.status(400).json({ message: 'Invalid role' });

    // Staff/Manager bắt buộc phải có cinema
    if ((role === 'staff' || role === 'manager') && !cinema) {
      return res.status(400).json({ message: 'cinema is required for staff/manager' });
    }

    // Check duplicate email/username
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists)
      return res.status(400).json({ message: 'Username or email already used' });

    const hashed = await bcrypt.hash(password || '12345678', 10);

    // Create user
    let created = await User.create({
      username,
      email,
      password: hashed,
      full_name,
      phone,
      role,
      avatar,
      birth_date,
      cinema: cinema || null
    });

    // ⭐ Populate cinema để trả về đầy đủ
    created = await created.populate('cinema');

     // ⭐ AUDIT LOG — admin tạo user mới
    req.auditAction  = 'user.admin_create';
    req.auditSummary = `Admin ${req.user.username || req.user.email} tạo user mới ${created.username || created.email} với role ${created.role}`;
    req.auditTarget  = {
      type: 'User',
      id:   created._id,
      name: created.username || created.email
    };

    res.status(201).json({
      message: 'User created',
      user: {
        id: created._id,
        username: created.username,
        email: created.email,
        role: created.role,
        cinema: created.cinema    // ⭐ FULL CINEMA INFO
      }
    });

  } catch (err) { next(err); }
};
exports.findByCard = async (req, res) => {
  try {
    const card = req.params.card;

    if (!card)
      return res.status(400).json({ message: "membership_card required" });

    const user = await User.findOne({
      membership_card: card,
      role: "customer",
      status: "active"
    }).select("full_name email membership_card");

    if (!user)
      return res.status(404).json({ message: "Member not found" });

    res.json({
      full_name: user.full_name,
      membership_card: user.membership_card,
      email: user.email
    });

  } catch (err) {
    res.status(500).json({ message: "Find member error", error: err.message });
  }
};
