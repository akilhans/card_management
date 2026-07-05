const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { auth, superAdmin } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({ globalLimit: 0, limitResetDays: 30 });
    } else if (setting.limitResetDays == null) {
      setting = await Setting.findByIdAndUpdate(
        setting._id,
        { $set: { limitResetDays: 30 } },
        { new: true }
      );
    }
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', auth, superAdmin, async (req, res) => {
  try {
    const { globalLimit: rawLimit, limitResetDays: rawResetDays } = req.body;
    const updates = {};

    if (rawLimit !== undefined) {
      const globalLimit = parseFloat(rawLimit);
      if (isNaN(globalLimit) || globalLimit < 0)
        return res.status(400).json({ message: 'To\'g\'ri limit kiritilishi shart' });
      updates.globalLimit = globalLimit;
    }

    if (rawResetDays !== undefined && rawResetDays !== '') {
      const limitResetDays = parseInt(rawResetDays, 10);
      if (isNaN(limitResetDays) || limitResetDays < 1)
        return res.status(400).json({ message: 'Qayta faollashtirish kunlari 1 yoki undan katta bo\'lishi kerak' });
      updates.limitResetDays = limitResetDays;
    }

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ message: 'Yangilash uchun ma\'lumot yuborilmadi' });

    const setting = await Setting.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
