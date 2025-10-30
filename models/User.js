// models/User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  full_name: { type: String },
  phone: { type: String },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['customer','staff','admin','manager'], default: 'customer' },
  avatar: String,

  birth_date: {
    type: Date,
    get: (v) => v ? v.toISOString().split('T')[0] : null  // ✅ chỉ lấy ngày
  },

  status: { type: String, enum: ['active','disabled'], default: 'active' },
  created_at: { type: Date, default: Date.now }
});

// ✅ Bật chế độ áp dụng getter khi chuyển về JSON
UserSchema.set('toJSON', { getters: true });

module.exports = mongoose.model('User', UserSchema);
