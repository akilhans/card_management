require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const hashedPassword = await bcrypt.hash('Dadakhanov17', 10);

    const existing = await User.findOne({ role: 'super_admin' });

    if (existing) {
      existing.username = 'JEK';
      existing.password = hashedPassword;
      await existing.save();

      console.log('✅ Super admin updated');
    } else {
      await User.create({
        username: 'JEK',
        password: hashedPassword,
        role: 'super_admin',
      });

      console.log('✅ Super admin created');
    }

  

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

seed();