require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const connectDB = require('./config/db');
const autoReactivateCards = require('./jobs/autoReactivateCards');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/owners', require('./routes/owners'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/settings', require('./routes/settings'));

const CRON_TIMEZONE = process.env.CRON_TIMEZONE || 'Asia/Tashkent';

// Daily at midnight — reactivate cards after limitResetDays from settings
cron.schedule(
  '0 0 * * *',
  async () => {
    try {
      await autoReactivateCards();
    } catch (err) {
      console.error('[cron] Auto-reactivation error:', err.message);
    }
  },
  { timezone: CRON_TIMEZONE }
);

console.log(`[cron] Daily auto-reactivation scheduled (00:00 ${CRON_TIMEZONE})`);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
