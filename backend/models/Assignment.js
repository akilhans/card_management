const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
}, { timestamps: true });

assignmentSchema.index({ admin: 1, owner: 1 }, { unique: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
