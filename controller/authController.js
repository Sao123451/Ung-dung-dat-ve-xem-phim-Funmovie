const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Otp = require('../models/Otp');
const { sendOTP } = require('../utils/email');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

/* ================================================================
   📌 1) REGISTER — AUTO OTP + KHÔNG GỬI MÃ MỚI KHI MÃ CŨ CÒN HIỆU LỰC
================================================================ */
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, otp_code, full_name, phone } = req.body;

    if (!email)
      return res.status(400).json({ message: "Thiếu email" });

    // CASE 1: Gửi OTP lần đầu
    if (!otp_code) {
      const usedEmail = await User.findOne({ email });
      if (usedEmail)
        return res.status(400).json({ message: "Email đã được sử dụng" });

      // Kiểm tra OTP cũ
      const oldOtp = await Otp.findOne({ email }).sort({ createdAt: -1 });
      if (oldOtp && oldOtp.expires_at > Date.now()) {
        return res.json({
          step: "verify_otp",
          message: "OTP vẫn còn hiệu lực, vui lòng kiểm tra email"
        });
      }

      // Tạo OTP mới
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = new Date(Date.now() + 1 * 60 * 1000);

      await Otp.create({ email, code, expires_at: expires });
      await sendOTP(email, code);

      return res.json({
        step: "verify_otp",
        message: "OTP đã được gửi vào email"
      });
    }

    // CASE 2: Xác nhận OTP
    const otp = await Otp.findOne({ email, code: otp_code });
    if (!otp)
      return res.status(400).json({ message: "OTP không hợp lệ" });

    if (otp.expires_at < Date.now())
      return res.status(400).json({ message: "OTP đã hết hạn" });

    const existsUser = await User.findOne({ username });
    if (existsUser)
      return res.status(400).json({ message: "Username đã được sử dụng" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
      full_name,
      phone
    });

    await Otp.deleteMany({ email });

    return res.status(201).json({
      message: "Đăng ký thành công",
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    next(err);
  }
};



/* ================================================================
   📌 2) LOGIN
================================================================ */
exports.login = async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;

    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
    });

    if (!user)
      return res.status(400).json({ message: "Tài khoản không tồn tại" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(400).json({ message: "Sai mật khẩu" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    next(err);
  }
};



/* ================================================================
   📌 3) STAFF LOGIN
================================================================ */
exports.staffLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Email không tồn tại" });

    if (user.role !== "staff")
      return res.status(403).json({ message: "Tài khoản không phải STAFF" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(400).json({ message: "Sai mật khẩu" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Đăng nhập STAFF thành công",
      token,
      user
    });

  } catch (err) {
    next(err);
  }
};



/* ================================================================
   📌 4) STAFF REGISTER
================================================================ */
exports.staffRegister = async (req, res, next) => {
  try {
    let { username, email, password, full_name, phone } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Thiếu email hoặc mật khẩu" });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email đã được sử dụng" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
      full_name,
      phone,
      role: "staff",
      status: "active"
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Đăng ký STAFF thành công",
      token,
      user
    });

  } catch (err) {
    next(err);
  }
};



/* ================================================================
   📌 5) CHANGE PASSWORD WITH OTP — AUTO
================================================================ */
exports.changePasswordWithOtp = async (req, res, next) => {
  try {
    const { email, otp_code, new_password } = req.body;

    if (!email)
      return res.status(400).json({ message: "Thiếu email" });

    // CASE 1: Gửi OTP lần đầu
    if (!otp_code || !new_password) {
      const user = await User.findOne({ email });
      if (!user)
        return res.status(400).json({ message: "Email không tồn tại" });

      // Check OTP cũ
      const oldOtp = await Otp.findOne({ email }).sort({ createdAt: -1 });
      if (oldOtp && oldOtp.expires_at > Date.now()) {
        return res.json({
          step: "verify_otp",
          message: "OTP vẫn còn hiệu lực, vui lòng kiểm tra email"
        });
      }

      // Gửi OTP mới
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = new Date(Date.now() + 5 * 60 * 1000);

      await Otp.create({ email, code, expires_at: expires });
      await sendOTP(email, code);

      return res.json({
        step: "verify_otp",
        message: "OTP đã được gửi tới email"
      });
    }

    // CASE 2: Xác nhận OTP + đổi mật khẩu
    const otp = await Otp.findOne({ email, code: otp_code });
    if (!otp)
      return res.status(400).json({ message: "OTP không hợp lệ" });

    if (otp.expires_at < Date.now())
      return res.status(400).json({ message: "OTP đã hết hạn" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Email không tồn tại" });

    const hashed = await bcrypt.hash(new_password, 10);
    user.password = hashed;
    await user.save();

    await Otp.deleteMany({ email });

    return res.json({ message: "Đổi mật khẩu thành công" });

  } catch (err) {
    next(err);
  }
};
