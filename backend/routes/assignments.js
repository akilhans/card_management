const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const { auth, superAdmin } = require('../middleware/auth');

router.get('/', auth, superAdmin, async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate('admin', 'username')
      .populate('owner', 'name')
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, superAdmin, async (req, res) => {
  try {
    const { adminId, ownerId } = req.body;
    if (!adminId || !ownerId)
      return res.status(400).json({ message: 'Admin va ega kiritilishi shart' });

    const existing = await Assignment.findOne({ admin: adminId, owner: ownerId });
    if (existing) return res.status(400).json({ message: 'Bu tayinlash allaqachon mavjud' });

    const assignment = await Assignment.create({ admin: adminId, owner: ownerId });
    await assignment.populate('admin', 'username');
    await assignment.populate('owner', 'name');
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, superAdmin, async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tayinlash o\'chirildi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
