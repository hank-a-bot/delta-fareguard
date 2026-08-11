const path = require('path');
const { dbAsync } = require('./db');
const { sendNotification } = require('./notifier');

let chromium = null;
try {
  const { chromium: extraChromium } = require('playwright-extra');
  const stealth = require('puppeteer-extra-plugin-stealth')();
  extraChromium.use(stealth);
  chromium = extraChromium;
} catch (e) {
  // Playwright optional on cloud hosts
}

const USER_DATA_DIR = path.join(__dirname, '../../delta_browser_profile');

/**
 * Executes or guides automated rebooking for a Delta flight
 */
async function executeRebook(flight, options = {}) {
  const isMiles = flight.payment_type === 'MILES';
  const originalPrice = flight.price_paid || 0;
  const originalMiles = flight.miles_paid || 0;

  const currentPrice = flight.current_lowest_price || originalPrice;
  const currentMiles = flight.current_lowest_miles || originalMiles;

  const refundCash = Math.max(0, originalPrice - currentPrice);
  const refundMiles = Math.max(0, originalMiles - currentMiles);

  // Deep-link direct URL to Delta's Find My Trip portal pre-populated
  const deltaDirectUrl = `https://www.delta.com/mytrips/findTrip?confirmationNumber=${encodeURIComponent(flight.confirmation_code)}&lastName=${encodeURIComponent(flight.passenger_last_name)}`;

  // If running on a cloud host without local display browser, return direct 1-click URL
  if (!chromium || process.env.RENDER || process.env.NODE_ENV === 'production') {
    console.log(`[RebookEngine] Cloud Host detected. Returning direct 1-click Delta URL for PNR: ${flight.confirmation_code}`);
    
    await dbAsync.run(
      `INSERT INTO rebook_logs (user_id, flight_id, original_price, new_price, refund_amount, status, log_details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        flight.user_id || 1,
        flight.id,
        isMiles ? originalMiles : originalPrice,
        isMiles ? currentMiles : currentPrice,
        isMiles ? refundMiles : refundCash,
        'DIRECT_LINK_GENERATED',
        `Generated 1-click Delta portal link for PNR ${flight.confirmation_code}. Claim refund: ${isMiles ? `${refundMiles.toLocaleString()} Miles` : `$${refundCash.toFixed(2)}`}`
      ]
    );

    return {
      success: true,
      mode: 'DIRECT_LINK',
      deltaUrl: deltaDirectUrl,
      pnr: flight.confirmation_code,
      lastName: flight.passenger_last_name,
      refundMiles,
      refundCash,
      message: `Direct 1-click link to Delta Find My Trip generated for PNR ${flight.confirmation_code}.`
    };
  }

  // Local Mac interactive Playwright guided session
  try {
    const browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await browserContext.newPage();
    await page.goto('https://www.delta.com/mytrips/findTrip', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    return {
      success: true,
      mode: 'GUIDED_PLAYWRIGHT',
      deltaUrl: deltaDirectUrl,
      pnr: flight.confirmation_code,
      lastName: flight.passenger_last_name,
      refundMiles,
      refundCash
    };
  } catch (err) {
    return {
      success: true,
      mode: 'DIRECT_LINK',
      deltaUrl: deltaDirectUrl,
      pnr: flight.confirmation_code,
      lastName: flight.passenger_last_name,
      refundMiles,
      refundCash
    };
  }
}

module.exports = { executeRebook };
