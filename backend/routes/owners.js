const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner');
const Assignment = require('../models/Assignment');
const { auth, superAdmin } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'super_admin') {
      return res.json(await Owner.find().sort({ name: 1 }));
    }
    const assignments = await Assignment.find({ admin: req.user.id }).populate('owner');
    res.json(assignments.map(a => a.owner).filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, superAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Ism kiritilishi shart' });
    const owner = await Owner.create({ name });
    res.status(201).json(owner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, superAdmin, async (req, res) => {
  try {
    const owner = await Owner.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );
    if (!owner) return res.status(404).json({ message: 'Ega topilmadi' });
    res.json(owner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, superAdmin, async (req, res) => {
  try {
    await Owner.findByIdAndDelete(req.params.id);
    await Assignment.deleteMany({ owner: req.params.id });
    res.json({ message: 'Ega o\'chirildi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
