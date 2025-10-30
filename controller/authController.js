// controller/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

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

exports.staffLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Email không tồn tại' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Sai mật khẩu' });

    if ((user.role || '').toLowerCase().trim() !== 'staff')
      return res.status(403).json({ message: 'Chỉ tài khoản STAFF mới được đăng nhập web staff' });
    console.log('staffLogin:', user.email, 'role=', user.role);

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login staff success',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

exports.staffRegister = async (req, res, next) => {
  try {
    let { username, email, password, full_name, phone } = req.body || {};

    // Chuẩn hoá input (bỏ khoảng trắng thừa và dấu phẩy ở cuối)
    email = (email || '').trim().toLowerCase().replace(/[,\s]+$/g, '');
    username = (username || '').trim().replace(/[,\s]+$/g, '');
    full_name = (full_name || '').trim();
    phone = (phone || '').trim();

    // Validate tối thiểu
    if (!email || !password) {
      return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự' });
    }

    // Kiểm tra trùng email/username (chỉ check field có giá trị)
    const orConds = [{ email }];
    if (username) orConds.push({ username });
    const exists = await User.findOne({ $or: orConds });
    if (exists) {
      return res.status(400).json({ message: 'Email hoặc username đã được sử dụng' });
    }

    // Tạo user
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashed,
      full_name,
      phone,
      role: 'staff',
      status: 'active'
    });

    // Có thể phát hành token luôn (FE không bắt buộc dùng, nhưng để sẵn)
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Trả về gọn: FE chỉ cần biết đã đăng ký OK để redirect về login
    return res.status(201).json({
      message: 'Đăng ký staff thành công',
      token, // FE có thể bỏ qua
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    return next(err);
  }
};