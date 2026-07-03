const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Owner', ownerSchema);
