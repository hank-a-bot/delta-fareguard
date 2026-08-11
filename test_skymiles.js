const { dbAsync } = require('./src/backend/db');
const { checkFlightPrice } = require('./src/backend/priceEngine');
const { importFlightFromReceipt } = require('./src/backend/gmailEngine');

async function testSkyMiles() {
  console.log('Testing Gmail E-Receipt Parser & SkyMiles Take Off 15% Discount Engine...');

  const sampleReceipt = `
    Confirmation Number: SKYSAV
    Passenger: Hank Assaf
    Flight: DL 482
    JFK to ATL
    Date: 2026-11-20
    Total Paid: 30,000 SkyMiles
    Take Off 15 Delta Amex Discount Applied
  `;

  const importRes = await importFlightFromReceipt(sampleReceipt);
  console.log('Imported Receipt Flight:', importRes.flight);

  const priceResult = await checkFlightPrice(importRes.flight);
  console.log('SkyMiles Price Check Result:', priceResult);

  console.log('SkyMiles & Take Off 15% Test Successful!');
  process.exit(0);
}

testSkyMiles().catch(err => {
  console.error('SkyMiles Test Error:', err);
  process.exit(1);
});
