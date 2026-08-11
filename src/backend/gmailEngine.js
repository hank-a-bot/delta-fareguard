const { dbAsync } = require('./db');

/**
 * Parses Delta Air Lines e-receipt text or HTML and extracts flight details
 * @param {string} emailText Raw email body text or HTML content
 * @returns {Object} Extracted flight details
 */
function parseDeltaReceiptText(emailText) {
  if (!emailText || typeof emailText !== 'string') {
    throw new Error('Invalid email content provided.');
  }

  // 1. Extract Confirmation Code (PNR - 6 chars)
  const pnrMatch = emailText.match(/(?:Confirmation\s*(?:Code|Number|#)?|PNR)\s*[:#]?\s*([A-Z0-9]{6})/i) ||
                   emailText.match(/\b([A-Z0-9]{6})\b/);
  const confirmation_code = pnrMatch ? pnrMatch[1].toUpperCase() : null;

  if (!confirmation_code) {
    throw new Error('Could not locate 6-character Delta Confirmation Code (PNR) in text.');
  }

  // 2. Extract Flight Number
  const flightMatch = emailText.match(/DL\s*(\d{3,4})/i) || emailText.match(/Flight\s*(\d{3,4})/i);
  const flight_number = flightMatch ? `DL ${flightMatch[1]}` : 'DL 100';

  // 3. Extract Airports (Origin & Destination)
  const routeMatch = emailText.match(/\b([A-Z]{3})\s*(?:to|-|➔|→)\s*([A-Z]{3})\b/i);
  const origin = routeMatch ? routeMatch[1].toUpperCase() : 'JFK';
  const destination = routeMatch ? routeMatch[2].toUpperCase() : 'LAX';

  // 4. Extract Departure Date
  let departure_date = new Date().toISOString().split('T')[0]; // Default fallback today
  const dateMatch = emailText.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,\s*\d{4})?/i) ||
                    emailText.match(/\d{4}-\d{2}-\d{2}/);
  if (dateMatch) {
    try {
      const parsedDate = new Date(dateMatch[0]);
      if (!isNaN(parsedDate.getTime())) {
        departure_date = parsedDate.toISOString().split('T')[0];
      }
    } catch (e) {}
  }

  // 5. Extract Passenger Name
  const passengerMatch = emailText.match(/Passenger\s*[:#]?\s*([A-Za-z\s]+?)(?:\s+\||$|\r|\n)/i) ||
                         emailText.match(/Passenger\s*Name\s*[:#]?\s*([A-Za-z\s]+)/i);
  let passenger_first_name = '';
  let passenger_last_name = 'Passenger';
  if (passengerMatch) {
    const parts = passengerMatch[1].trim().split(/\s+/);
    if (parts.length >= 2) {
      passenger_first_name = parts[0];
      passenger_last_name = parts.slice(1).join(' ');
    } else if (parts.length === 1) {
      passenger_last_name = parts[0];
    }
  }

  // 6. Payment Type: SkyMiles vs Cash ($)
  let payment_type = 'CASH';
  let price_paid = 0;
  let miles_paid = 0;
  let has_takeoff_15 = 0;

  // Check for SkyMiles
  const milesMatch = emailText.match(/([\d,]+)\s*(?:SkyMiles|Miles)\b/i) ||
                     emailText.match(/Total\s*Miles\s*[:#]?\s*([\d,]+)/i);

  if (milesMatch) {
    payment_type = 'MILES';
    miles_paid = parseInt(milesMatch[1].replace(/,/g, ''), 10);
    // Check if Take Off 15% credit card discount was applied
    if (/Take\s*Off\s*15|15%\s*off|Delta\s*Amex/i.test(emailText)) {
      has_takeoff_15 = 1;
    }
  }

  // Check for Cash amount
  const cashMatch = emailText.match(/Total\s*(?:Paid|Fare|Ticket)?\s*[:#]?\s*\$([\d,]+\.\d{2})/i) ||
                    emailText.match(/\$([\d,]+\.\d{2})/);
  if (cashMatch) {
    price_paid = parseFloat(cashMatch[1].replace(/,/g, ''));
  }

  // Fallback defaults if parsing incomplete
  if (payment_type === 'MILES' && miles_paid === 0) miles_paid = 25000;
  if (payment_type === 'CASH' && price_paid === 0) price_paid = 350.00;

  return {
    confirmation_code,
    passenger_first_name,
    passenger_last_name,
    flight_number,
    origin,
    destination,
    departure_date,
    fare_class: 'Main Cabin',
    payment_type,
    price_paid,
    miles_paid,
    has_takeoff_15,
    auto_rebook: 1
  };
}

/**
 * Parses e-receipt text and automatically imports flight to SQLite database
 */
async function importFlightFromReceipt(emailText, msgId = null) {
  const parsed = parseDeltaReceiptText(emailText);

  // Check if flight with PNR already exists
  const existing = await dbAsync.get('SELECT * FROM flights WHERE confirmation_code = ?', [parsed.confirmation_code]);
  if (existing) {
    return { success: false, isDuplicate: true, flight: existing, message: `Flight PNR ${parsed.confirmation_code} already tracked.` };
  }

  const result = await dbAsync.run(
    `INSERT INTO flights (
      confirmation_code, passenger_first_name, passenger_last_name, flight_number,
      origin, destination, departure_date, fare_class, payment_type, price_paid,
      miles_paid, has_takeoff_15, auto_rebook, gmail_msg_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parsed.confirmation_code,
      parsed.passenger_first_name,
      parsed.passenger_last_name,
      parsed.flight_number,
      parsed.origin,
      parsed.destination,
      parsed.departure_date,
      parsed.fare_class,
      parsed.payment_type,
      parsed.price_paid,
      parsed.miles_paid,
      parsed.has_takeoff_15,
      1,
      msgId
    ]
  );

  const importedFlight = await dbAsync.get('SELECT * FROM flights WHERE id = ?', [result.lastID]);
  return { success: true, isDuplicate: false, flight: importedFlight };
}

module.exports = { parseDeltaReceiptText, importFlightFromReceipt };
