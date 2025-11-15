const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OtpSchema = new Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },       // OTP 6 số
  expires_at: { type: Date, required: true }    // Hết hạn sau 5 phút
}, {
  timestamps: true
});

// Tự xoá khi hết hạn
OtpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', OtpSchema);
