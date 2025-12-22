// models/User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/* ============================================================
    Generate unique 10-digit membership card
   ============================================================ */
async function generateUniqueMemberCard() {
  let card = "";
  let exists = true;

  while (exists) {
    // Tạo dãy 10 chữ số
    card = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    // Kiểm tra xem đã tồn tại chưa
    exists = await mongoose.model("User").findOne({ membership_card: card });
  }

  return card;
}

/* ============================================================
    USER SCHEMA
   ============================================================ */
const UserSchema = new Schema({

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

  birth_date: {
    type: Date,
    get: (v) => (v ? v.toISOString().split('T')[0] : null)
  },

  status: { 
    type: String, 
    enum: ['active', 'disabled'], 
    default: 'active' 
  },

  cinema: { 
    type: Schema.Types.ObjectId,
    ref: 'Cinema',
    default: null
  },

  email_verified: { type: Boolean, default: false },
  otp_code: { type: String, default: null },
  otp_expire: { type: Date, default: null },

  // ⭐ Membership Card (10 digits)
  membership_card: { type: String, default: null, unique: true, sparse: null },

  created_at: { type: Date, default: Date.now }
});


// ============================================================
// AUTO GENERATE UNIQUE 10-DIGIT MEMBERSHIP CARD
// ============================================================
UserSchema.pre("save", async function(next) {
  // Nếu không phải customer → membership_card luôn null
  if (this.role !== "customer") {
    this.membership_card = null;
    return next();
  }

  // Nếu là customer và chưa có membership card → tự tạo
  if (!this.membership_card) {
    this.membership_card = await generateUniqueMemberCard();
  }

  next();
});

UserSchema.set('toJSON', { getters: true });

module.exports = mongoose.model('User', UserSchema);
