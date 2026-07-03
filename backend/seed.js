require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ role: 'super_admin' });
  if (existing) {
    console.log('Super admin already exists:', existing.username);
    process.exit(0);
  }

  const password = await bcrypt.hash('admin123', 10);
  await User.create({ username: 'superadmin', password, role: 'super_admin' });
  console.log('Super admin created:');
  console.log('  username: superadmin');
  console.log('  password: admin123');
  process.exit(0);
};

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
