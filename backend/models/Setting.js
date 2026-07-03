const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  globalLimit: { type: Number, default: 0 },
});

module.exports = mongoose.model('Setting', settingSchema);
