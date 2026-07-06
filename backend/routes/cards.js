const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const Setting = require('../models/Setting');
const { auth, superAdmin } = require('../middleware/auth');

const populateCard = (query) =>
  query.populate('assignedAdmin', 'username').populate('takenBy', 'username');

router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'super_admin') {
      const filter = {};
      if (req.query.admin) filter.assignedAdmin = req.query.admin;
      const cards = await populateCard(Card.find(filter)).sort({ createdAt: -1 });
      return res.json(cards);
    }
    const cards = await populateCard(
      Card.find({ assignedAdmin: req.user.id, taken: false })
    ).sort({ createdAt: -1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, superAdmin, async (req, res) => {
  try {
    const { assignedAdmin, type, number, expiryDate, bankName, cardHolderName, cardHolderPhone } = req.body;
    if (!assignedAdmin || !type || !number || !expiryDate || !bankName || !cardHolderName || !cardHolderPhone)
      return res.status(400).json({ message: 'Admin, tur, raqam, amal qilish muddati, bank nomi, F.I.Sh. va telefon raqami kiritilishi shart' });
    const card = await Card.create({ assignedAdmin, type, number, expiryDate, bankName, cardHolderName, cardHolderPhone });
    const populated = await populateCard(Card.findById(card._id));
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, superAdmin, async (req, res) => {
  try {
    const { assignedAdmin, type, number, expiryDate, bankName, cardHolderName, cardHolderPhone } = req.body;
    const card = await populateCard(
      Card.findByIdAndUpdate(
        req.params.id,
        { assignedAdmin, type, number, expiryDate, bankName, cardHolderName, cardHolderPhone },
        { new: true }
      )
    );
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
    const populated = await populateCard(Card.findById(card._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/reactivate', auth, superAdmin, async (req, res) => {
  try {
    const card = await populateCard(
      Card.findByIdAndUpdate(
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
      )
    );
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
    if (card.assignedAdmin.toString() !== req.user.id)
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
