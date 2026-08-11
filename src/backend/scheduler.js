const cron = require('node-cron');
const { dbAsync } = require('./db');
const { checkFlightPrice } = require('./priceEngine');
const { executeRebook } = require('./rebookEngine');
const { sendNotification } = require('./notifier');

let scheduledTask = null;

/**
 * Initializes and starts the daily cron job scheduler
 */
async function initScheduler() {
  try {
    const cronSetting = await dbAsync.get("SELECT value FROM settings WHERE key = 'cron_schedule'");
    const cronExpression = (cronSetting && cronSetting.value) ? cronSetting.value : '0 9 * * *'; // Default 9:00 AM daily

    console.log(`[Scheduler] Starting cron job schedule: "${cronExpression}" (Default: Daily at 9:00 AM)`);

    if (scheduledTask) {
      scheduledTask.stop();
    }

    if (!cron.validate(cronExpression)) {
      console.error(`[Scheduler Error] Invalid cron expression: "${cronExpression}". Falling back to "0 9 * * *"`);
    }

    scheduledTask = cron.schedule(cron.validate(cronExpression) ? cronExpression : '0 9 * * *', async () => {
      console.log(`[Scheduler] Executing scheduled daily 9 AM price check at ${new Date().toISOString()}...`);
      await runDailyCheckJob();
    });

  } catch (err) {
    console.error('[Scheduler Error] Failed to initialize scheduler:', err);
  }
}

/**
 * Executes price checks for all active tracked flights and triggers auto-rebook if price dropped
 */
async function runDailyCheckJob() {
  try {
    const flights = await dbAsync.all("SELECT * FROM flights WHERE status = 'TRACKING'");
    console.log(`[Scheduler Job] Found ${flights.length} active tracked Delta flights.`);

    for (const flight of flights) {
      try {
        const result = await checkFlightPrice(flight);

        // If price drop detected and auto-rebook is enabled for flight
        if (result.hasPriceDrop && flight.auto_rebook === 1) {
          console.log(`🎉 [Scheduler Job] PRICE DROP DETECTED for Flight ${flight.flight_number}! Savings: $${result.savings.toFixed(2)}. Triggering Auto-Rebook...`);

          // Execute rebooking flow
          await executeRebook(flight, { headful: true, mode: 'guided' });
        } else if (result.hasPriceDrop) {
          // Notify user of price drop even if auto_rebook is disabled
          await sendNotification({
            subject: `📉 Delta Price Drop Alert: Flight ${flight.flight_number}`,
            text: `Price dropped by $${result.savings.toFixed(2)} for ${flight.flight_number} (PNR: ${flight.confirmation_code}). Current price: $${result.currentPrice} (paid $${result.pricePaid}).`,
            html: `<h3>📉 Price Drop Alert</h3><p>Price dropped by <b>$${result.savings.toFixed(2)}</b> for <b>${flight.flight_number}</b>!</p>`
          });
        }
      } catch (flightErr) {
        console.error(`[Scheduler Job Error] Failed checking flight ID ${flight.id}:`, flightErr.message);
      }
    }
  } catch (jobErr) {
    console.error('[Scheduler Job Error]:', jobErr);
  }
}

module.exports = { initScheduler, runDailyCheckJob };
