const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({

  // ===== BASIC INFO =====
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  full_name: { type: String, trim: true },
  phone: { type: String, trim: true },

  email: { type: String, required: true, unique: true, lowercase: true, trim: true },

  role: { 
    type: String, 
    enum: ['customer', 'staff', 'admin', 'manager'], 
    default: 'customer' 
  },

  avatar: { type: String },

  // ===== DATE OF BIRTH =====
  birth_date: {
    type: Date,
    get: (v) => (v ? v.toISOString().split('T')[0] : null)
  },

  // ===== ACCOUNT STATUS =====
  status: { 
    type: String, 
    enum: ['active', 'disabled'], 
    default: 'active' 
  },

  // ===== CINEMA (FOR STAFF/MANAGER) =====
  cinema: { 
    type: Schema.Types.ObjectId,
    ref: 'Cinema',
    default: null
  },

  // ===== EMAIL VERIFICATION USING OTP =====
  email_verified: { type: Boolean, default: false },

  otp_code: { type: String, default: null },
  otp_expire: { type: Date, default: null },

  // ===== CREATED AT =====
  created_at: { type: Date, default: Date.now }
});

// Enable getters for JSON output
UserSchema.set('toJSON', { getters: true });

module.exports = mongoose.model('User', UserSchema);
