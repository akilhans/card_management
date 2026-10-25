const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
