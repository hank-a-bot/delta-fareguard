const { dbAsync } = require('./src/backend/db');
const { checkFlightPrice } = require('./src/backend/priceEngine');

async function test() {
  console.log('Testing flight creation and price engine check...');
  
  // Insert demo flight
  const res = await dbAsync.run(`
    INSERT INTO flights (
      confirmation_code, passenger_first_name, passenger_last_name, flight_number,
      origin, destination, departure_date, fare_class, price_paid, auto_rebook
    ) VALUES ('DEMO99', 'Hank', 'Assaf', 'DL 1452', 'JFK', 'LAX', '2026-10-15', 'Main Cabin', 450.00, 1)
  `);

  const flight = await dbAsync.get('SELECT * FROM flights WHERE id = ?', [res.lastID]);
  console.log('Created flight:', flight);

  const checkResult = await checkFlightPrice(flight);
  console.log('Price Check Result:', checkResult);

  const updatedFlight = await dbAsync.get('SELECT * FROM flights WHERE id = ?', [res.lastID]);
  console.log('Updated Flight Record:', updatedFlight);

  console.log('Test successful!');
  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
