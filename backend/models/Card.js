const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  type: { type: String, enum: ['HUMO', 'UZCARD'], required: true },
  number: { type: String, required: true, trim: true },
  expiryDate: { type: String, required: true, trim: true },
  bankName: { type: String, required: true, trim: true },
  cardHolderName: { type: String, required: true, trim: true },
  cardHolderPhone: { type: String, required: true, trim: true },
  status: { type: String, enum: ['ACTIVE', 'LIMIT_REACHED'], default: 'ACTIVE' },
  receivedAmount: { type: Number, default: 0 },
  taken: { type: Boolean, default: false },
  takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  takenAt: { type: Date, default: null },
  limitReachedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Card', cardSchema);
