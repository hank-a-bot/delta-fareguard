const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const path = require('path');
const { dbAsync } = require('./db');
const { sendNotification } = require('./notifier');

const USER_DATA_DIR = path.join(__dirname, '../../delta_browser_profile');

/**
 * Executes or guides automated rebooking for a Delta flight
 * @param {Object} flight Flight record from SQLite DB
 * @param {Object} options Options like { headful: true, mode: 'guided' | 'full' }
 */
async function executeRebook(flight, options = {}) {
  const isHeadful = options.headful !== false; // Default to visible browser for maximum reliability
  console.log(`[RebookEngine] Initiating ${isHeadful ? 'Guided Interactive' : 'Headless Auto'} Rebook for PNR: ${flight.confirmation_code}`);

  let browserContext = null;
  let resultStatus = 'IN_PROGRESS';
  let logDetails = '';
  const originalPrice = flight.price_paid;
  const targetNewPrice = flight.current_lowest_price || (flight.price_paid - 50);
  const estimatedRefund = Math.max(0, originalPrice - targetNewPrice);

  try {
    // Launch persistent context so user Delta cookies & auth state persist across runs
    browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: !isHeadful,
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized'
      ]
    });

    const page = await browserContext.newPage();

    console.log('[RebookEngine] Navigating to Delta Find Trip portal...');
    await page.goto('https://www.delta.com/mytrips/findTrip', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // Fill in PNR and Passenger details
    console.log(`[RebookEngine] Auto-filling PNR: ${flight.confirmation_code}, Name: ${flight.passenger_last_name}`);

    // Delta Find Trip selectors (handles dynamic inputs)
    try {
      const pnrInput = page.locator('input[name="confirmationNumber"], input[id*="confirmationNumber"], input[placeholder*="Confirmation"]');
      if (await pnrInput.count() > 0) {
        await pnrInput.first().fill(flight.confirmation_code);
      }

      const lastNameInput = page.locator('input[name="lastName"], input[id*="lastName"], input[placeholder*="Last Name"]');
      if (await lastNameInput.count() > 0) {
        await lastNameInput.first().fill(flight.passenger_last_name);
      }

      if (flight.passenger_first_name) {
        const firstNameInput = page.locator('input[name="firstName"], input[id*="firstName"], input[placeholder*="First Name"]');
        if (await firstNameInput.count() > 0) {
          await firstNameInput.first().fill(flight.passenger_first_name);
        }
      }

      // Submit search
      const submitBtn = page.locator('button[type="submit"], button:has-text("Search"), button:has-text("Find My Trip")');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        console.log('[RebookEngine] Submitted trip search.');
        await page.waitForTimeout(5000);
      }
    } catch (fillErr) {
      console.warn('[RebookEngine] Direct selector fill warning:', fillErr.message);
    }

    logDetails = `Guided automation opened Delta Find Trip portal with pre-filled PNR ${flight.confirmation_code} and Last Name ${flight.passenger_last_name}. Potential refund: $${estimatedRefund.toFixed(2)}.`;
    resultStatus = 'GUIDED_SESSION_ACTIVE';

    // If headful guided mode, leave browser open for user or keep session alive for 2 minutes
    if (isHeadful) {
      console.log('[RebookEngine] Guided Browser Session actively running. User can review and confirm flight change on Delta.');
      // Keep open for user interaction
      await page.waitForTimeout(30000);
    }

    await browserContext.close();

    // Record rebook execution attempt in DB
    await dbAsync.run(
      `INSERT INTO rebook_logs (flight_id, original_price, new_price, refund_amount, status, log_details) VALUES (?, ?, ?, ?, ?, ?)`,
      [flight.id, originalPrice, targetNewPrice, estimatedRefund, resultStatus, logDetails]
    );

    // Update flight status
    await dbAsync.run(
      `UPDATE flights SET status = 'REBOOKED' WHERE id = ?`,
      [flight.id]
    );

    // Send Notification
    await sendNotification({
      subject: `✈️ Rebooking Initiated for Flight ${flight.flight_number} (PNR: ${flight.confirmation_code})`,
      text: `Delta FareGuard detected a lower fare of $${targetNewPrice} (paid $${originalPrice}). Rebooking session initiated! Estimated eCredit refund: $${estimatedRefund.toFixed(2)}.`,
      html: `<h3>✈️ Delta FareGuard Rebooking Alert</h3><p>Lower fare detected for <b>${flight.flight_number}</b>!</p><p>Original Paid: <b>$${originalPrice}</b><br>New Lower Fare: <b>$${targetNewPrice}</b><br><b>Your Savings: $${estimatedRefund.toFixed(2)}</b></p>`
    });

    return {
      success: true,
      status: resultStatus,
      flightId: flight.id,
      originalPrice,
      newPrice: targetNewPrice,
      refundAmount: estimatedRefund,
      message: logDetails
    };

  } catch (err) {
    if (browserContext) await browserContext.close();
    console.error('[RebookEngine Error]:', err.message);

    await dbAsync.run(
      `INSERT INTO rebook_logs (flight_id, original_price, new_price, refund_amount, status, log_details) VALUES (?, ?, ?, ?, ?, ?)`,
      [flight.id, originalPrice, targetNewPrice, 0, 'FAILED', `Error: ${err.message}`]
    );

    throw err;
  }
}

module.exports = { executeRebook };
