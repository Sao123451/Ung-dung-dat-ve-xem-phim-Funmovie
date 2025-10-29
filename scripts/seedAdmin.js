require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const exists = await User.findOne({ email: 'admin@example.com' });
    if (exists) { console.log('Admin existed'); process.exit(0); }

    const hashed = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashed,
      full_name: 'System Admin',
      role: 'admin',
      status: 'active'
    });
    console.log('✅ Seeded admin@example.com / admin123');
    process.exit(0);
  } catch (e) { console.error(e); process.exit(1); }
})();
