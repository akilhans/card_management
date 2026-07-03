const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const { auth, superAdmin } = require('../middleware/auth');

router.get('/', auth, superAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, superAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Foydalanuvchi nomi va parol kiritilishi shart' });

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Bu foydalanuvchi nomi allaqachon mavjud' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed, role: 'admin' });
    const { password: _, ...userObj } = user.toObject();
    res.status(201).json(userObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, superAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;
    const update = {};
    if (username) update.username = username;
    if (password) update.password = await bcrypt.hash(password, 10);

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'Admin topilmadi' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, superAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Assignment.deleteMany({ admin: req.params.id });
    res.json({ message: 'Admin o\'chirildi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
