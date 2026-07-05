const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const Assignment = require('../models/Assignment');
const Setting = require('../models/Setting');
const { auth, superAdmin } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'super_admin') {
      const cards = await Card.find()
        .populate('owner', 'name')
        .populate('takenBy', 'username')
        .sort({ createdAt: -1 });
      return res.json(cards);
    }
    const assignments = await Assignment.find({ admin: req.user.id });
    const ownerIds = assignments.map(a => a.owner);
    const cards = await Card.find({ owner: { $in: ownerIds }, taken: false })
      .populate('owner', 'name')
      .sort({ createdAt: -1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, superAdmin, async (req, res) => {
  try {
    const { owner, type, number, expiryDate, cardHolderName, cardHolderPhone } = req.body;
    if (!owner || !type || !number || !expiryDate || !cardHolderName || !cardHolderPhone)
      return res.status(400).json({ message: 'Ega, tur, raqam, amal qilish muddati, egasining F.I.Sh. va telefon raqami kiritilishi shart' });
    const card = await Card.create({ owner, type, number, expiryDate, cardHolderName, cardHolderPhone });
    await card.populate('owner', 'name');
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, superAdmin, async (req, res) => {
  try {
    const { owner, type, number, expiryDate, cardHolderName, cardHolderPhone } = req.body;
    const card = await Card.findByIdAndUpdate(
      req.params.id,
      { owner, type, number, expiryDate, cardHolderName, cardHolderPhone },
      { new: true }
    ).populate('owner', 'name').populate('takenBy', 'username');
    if (!card) return res.status(404).json({ message: 'Karta topilmadi' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, superAdmin, async (req, res) => {
  try {
    await Card.findByIdAndDelete(req.params.id);
    res.json({ message: 'Karta o\'chirildi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/received', auth, superAdmin, async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount < 0)
      return res.status(400).json({ message: 'To\'g\'ri summa kiritilishi shart' });

    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Karta topilmadi' });

    const setting = await Setting.findOne();
    const globalLimit = setting ? setting.globalLimit : 0;

    card.receivedAmount = amount;
    if (globalLimit > 0 && amount >= globalLimit) {
      card.status = 'LIMIT_REACHED';
      if (!card.limitReachedAt) card.limitReachedAt = new Date();
    } else {
      card.status = 'ACTIVE';
      card.limitReachedAt = null;
    }
    await card.save();
    await card.populate('owner', 'name');
    await card.populate('takenBy', 'username');
    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/reactivate', auth, superAdmin, async (req, res) => {
  try {
    const card = await Card.findByIdAndUpdate(
      req.params.id,
      {
        status: 'ACTIVE',
        receivedAmount: 0,
        limitReachedAt: null,
        taken: false,
        takenBy: null,
        takenAt: null,
      },
      { new: true }
    ).populate('owner', 'name').populate('takenBy', 'username');
    if (!card) return res.status(404).json({ message: 'Karta topilmadi' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/take', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Faqat adminlar uchun' });

    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Karta topilmadi' });
    if (card.taken) return res.status(400).json({ message: 'Karta allaqachon olingan' });

    const assignments = await Assignment.find({ admin: req.user.id });
    const ownerIds = assignments.map(a => a.owner.toString());
    if (!ownerIds.includes(card.owner.toString()))
      return res.status(403).json({ message: 'Bu karta uchun ruxsat yo\'q' });

    card.taken = true;
    card.takenBy = req.user.id;
    card.takenAt = new Date();
    await card.save();
    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
