const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  full_name: { type: String },
  phone: { type: String },
  email: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    enum: ['customer','staff','admin','manager'], 
    default: 'customer' 
  },
  avatar: { type: String },

  birth_date: {
    type: Date,
    get: (v) => v ? v.toISOString().split('T')[0] : null
  },

  status: { type: String, enum: ['active','disabled'], default: 'active' },

  // ⭐ THÊM DÒNG NÀY — ĐỂ POPULATE CINEMA
  cinema: { 
    type: Schema.Types.ObjectId,
    ref: 'Cinema',
    default: null
  },

  created_at: { type: Date, default: Date.now }
});

UserSchema.set('toJSON', { getters: true });

module.exports = mongoose.model('User', UserSchema);
