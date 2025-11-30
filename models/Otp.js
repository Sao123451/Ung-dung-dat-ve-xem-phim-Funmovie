const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OtpSchema = new Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },       // OTP 6 số
  expires_at: { type: Date, required: true },   // Hết hạn OTP (chỉ dùng cho bước verify OTP)
  
  //  Sau khi verify OTP thành công, flag này bật true
  // → Sang màn đặt mật khẩu KHÔNG cần OTP nữa
  otp_verified: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Tự xoá bản ghi khi hết hạn OTP
// (MongoDB TTL index)
OtpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', OtpSchema);
