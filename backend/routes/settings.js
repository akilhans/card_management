const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { auth, superAdmin } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) setting = await Setting.create({ globalLimit: 0 });
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', auth, superAdmin, async (req, res) => {
  try {
    const globalLimit = parseFloat(req.body.globalLimit);
    if (isNaN(globalLimit) || globalLimit < 0)
      return res.status(400).json({ message: 'To\'g\'ri limit kiritilishi shart' });

    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({ globalLimit });
    } else {
      setting.globalLimit = globalLimit;
      await setting.save();
    }
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
