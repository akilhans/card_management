const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Card = require('../models/Card');
const { auth, superAdmin } = require('../middleware/auth');

// Barcha bo'limlarni olish (admin va superadmin uchun)
router.get('/', auth, async (req, res) => {
  try {
    const departments = await Department.find().sort({ order: 1, createdAt: 1 });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Yangi bo'lim qo'shish (faqat superadmin)
router.post('/', auth, superAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Bo\'lim nomi kiritilishi shart' });
    }
    const trimmed = name.trim();
    const existing = await Department.findOne({ name: { $regex: new RegExp(`^${trimmed}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: 'Bunday nomli bo\'lim allaqachon mavjud' });
    }
    const count = await Department.countDocuments();
    const department = await Department.create({ name: trimmed, order: count });
    res.status(201).json(department);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bo'lim nomini tahrirlash (faqat superadmin)
router.put('/:id', auth, superAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Bo\'lim nomi kiritilishi shart' });
    }
    const trimmed = name.trim();
    const existing = await Department.findOne({
      _id: { $ne: req.params.id },
      name: { $regex: new RegExp(`^${trimmed}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({ message: 'Bunday nomli bo\'lim allaqachon mavjud' });
    }
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name: trimmed },
      { new: true }
    );
    if (!department) return res.status(404).json({ message: 'Bo\'lim topilmadi' });
    res.json(department);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bo'limni o'chirish (faqat superadmin)
router.delete('/:id', auth, superAdmin, async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return res.status(404).json({ message: 'Bo\'lim topilmadi' });
    
    // Ushbu bo'limga tegishli kartalarning department qiymatini null qilish
    await Card.updateMany({ department: req.params.id }, { $set: { department: null } });

    res.json({ message: 'Bo\'lim o\'chirildi va kartalar bo\'limsiz holatga o\'tkazildi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
