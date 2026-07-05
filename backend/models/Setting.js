const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  globalLimit: { type: Number, default: 0 },
  limitResetDays: { type: Number, default: 30, min: 1 },
});

module.exports = mongoose.model('Setting', settingSchema);
