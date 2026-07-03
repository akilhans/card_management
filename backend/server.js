require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const connectDB = require('./config/db');

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

// Auto-reactivate cards 30 days after reaching limit — runs daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const Card = require('./models/Card');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await Card.updateMany(
      { status: 'LIMIT_REACHED', limitReachedAt: { $lte: thirtyDaysAgo } },
      {
        $set: {
          status: 'ACTIVE',
          receivedAmount: 0,
          limitReachedAt: null,
          taken: false,
          takenBy: null,
          takenAt: null,
        },
      }
    );
    if (result.modifiedCount > 0)
      console.log(`Auto-reactivated ${result.modifiedCount} card(s)`);
  } catch (err) {
    console.error('Auto-reactivation error:', err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
