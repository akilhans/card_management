const Card = require('../models/Card');
const Setting = require('../models/Setting');

const autoReactivateCards = async () => {
  let setting = await Setting.findOne();
  if (!setting) setting = await Setting.create({ globalLimit: 0, limitResetDays: 30 });

  const resetDays = setting.limitResetDays || 30;
  const cutoff = new Date(Date.now() - resetDays * 24 * 60 * 60 * 1000);

  const result = await Card.updateMany(
    { status: 'LIMIT_REACHED', limitReachedAt: { $lte: cutoff } },
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

  if (result.modifiedCount > 0) {
    console.log(`[cron] Auto-reactivated ${result.modifiedCount} card(s) after ${resetDays} day(s)`);
  }

  return { modifiedCount: result.modifiedCount, resetDays };
};

module.exports = autoReactivateCards;
