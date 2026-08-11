const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { dbAsync } = require('./db');
const { encrypt, decrypt } = require('./crypto');
const { registerUser, loginUser, requireAuth } = require('./auth');
const { checkFlightPrice } = require('./priceEngine');
const { executeRebook } = require('./rebookEngine');
const { initScheduler, runDailyCheckJob } = require('./scheduler');
const { importFlightFromReceipt } = require('./gmailEngine');
const { initEmailPoller, getOrCreateBurnerAccount } = require('./emailPoller');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files if built
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await registerUser(email, password, name);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await dbAsync.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [req.userId]);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// BURNER EMAIL ADDRESS ROUTE
// ----------------------------------------------------

app.get('/api/burner-email', async (req, res) => {
  try {
    const burner = await getOrCreateBurnerAccount();
    res.json({ success: true, email: burner.user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// DEDICATED INBOUND EMAIL WEBHOOK
// ----------------------------------------------------

app.post('/api/webhooks/inbound-email', async (req, res) => {
  try {
    const emailBody = req.body.text || req.body['stripped-text'] || req.body.html || req.body.receiptText || JSON.stringify(req.body);
    console.log('[Inbound Email Webhook] Received forwarded email receipt.');

    const result = await importFlightFromReceipt(emailBody);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Inbound Email Webhook Error]:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// API ROUTES: FLIGHTS (User Isolated & Encrypted)
// ----------------------------------------------------

app.get('/api/flights', requireAuth, async (req, res) => {
  try {
    const flights = await dbAsync.all('SELECT * FROM flights WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    const decryptedFlights = flights.map(f => ({
      ...f,
      confirmation_code: decrypt(f.confirmation_code)
    }));
    res.json({ success: true, flights: decryptedFlights });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/flights', requireAuth, async (req, res) => {
  try {
    const {
      confirmation_code,
      passenger_first_name,
      passenger_last_name,
      flight_number,
      origin,
      destination,
      departure_date,
      fare_class,
      payment_type,
      price_paid,
      miles_paid,
      has_takeoff_15,
      auto_rebook
    } = req.body;

    if (!confirmation_code || !passenger_last_name || !flight_number || !origin || !destination || !departure_date) {
      return res.status(400).json({ success: false, error: 'Missing required flight fields.' });
    }

    const encryptedPnr = encrypt(confirmation_code.toUpperCase().trim());

    const result = await dbAsync.run(
      `INSERT INTO flights (
        user_id, confirmation_code, passenger_first_name, passenger_last_name, flight_number,
        origin, destination, departure_date, fare_class, payment_type, price_paid,
        miles_paid, has_takeoff_15, auto_rebook
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        encryptedPnr,
        (passenger_first_name || '').trim(),
        passenger_last_name.trim(),
        flight_number.toUpperCase().trim(),
        origin.toUpperCase().trim(),
        destination.toUpperCase().trim(),
        departure_date,
        fare_class || 'Main Cabin',
        payment_type || 'CASH',
        parseFloat(price_paid || 0),
        parseInt(miles_paid || 0, 10),
        has_takeoff_15 ? 1 : 0,
        auto_rebook !== undefined ? (auto_rebook ? 1 : 0) : 1
      ]
    );

    const newFlight = await dbAsync.get('SELECT * FROM flights WHERE id = ?', [result.lastID]);
    newFlight.confirmation_code = confirmation_code.toUpperCase().trim();

    checkFlightPrice(newFlight).catch(e => console.error('Initial check background error:', e.message));

    res.json({ success: true, flight: newFlight });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/receipts/import', requireAuth, async (req, res) => {
  try {
    const { receiptText } = req.body;
    if (!receiptText) {
      return res.status(400).json({ success: false, error: 'No receipt text provided.' });
    }

    const result = await importFlightFromReceipt(receiptText);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/flights/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { auto_rebook, status, price_paid, miles_paid, has_takeoff_15 } = req.body;

    await dbAsync.run(
      `UPDATE flights SET 
        auto_rebook = COALESCE(?, auto_rebook), 
        status = COALESCE(?, status),
        price_paid = COALESCE(?, price_paid),
        miles_paid = COALESCE(?, miles_paid),
        has_takeoff_15 = COALESCE(?, has_takeoff_15)
      WHERE id = ? AND user_id = ?`,
      [
        auto_rebook !== undefined ? (auto_rebook ? 1 : 0) : null,
        status,
        price_paid,
        miles_paid,
        has_takeoff_15 !== undefined ? (has_takeoff_15 ? 1 : 0) : null,
        id,
        req.userId
      ]
    );

    const updated = await dbAsync.get('SELECT * FROM flights WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (updated) updated.confirmation_code = decrypt(updated.confirmation_code);
    res.json({ success: true, flight: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/flights/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await dbAsync.run('DELETE FROM flights WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ success: true, message: 'Flight deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/flights/:id/check', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const flight = await dbAsync.get('SELECT * FROM flights WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!flight) return res.status(404).json({ success: false, error: 'Flight not found.' });

    flight.confirmation_code = decrypt(flight.confirmation_code);
    const result = await checkFlightPrice(flight);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/flights/:id/rebook', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const flight = await dbAsync.get('SELECT * FROM flights WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!flight) return res.status(404).json({ success: false, error: 'Flight not found.' });

    flight.confirmation_code = decrypt(flight.confirmation_code);
    const result = await executeRebook(flight, { headful: true, mode: 'guided' });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/check-all', requireAuth, async (req, res) => {
  try {
    runDailyCheckJob().catch(e => console.error('Check all background error:', e));
    res.json({ success: true, message: 'Price check initiated for all active tracked flights.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// API ROUTES: SETTINGS & REBOOK LOGS
// ----------------------------------------------------

app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    const settingsRows = await dbAsync.all('SELECT * FROM settings WHERE user_id = ?', [req.userId]);
    const settings = {};
    settingsRows.forEach(r => settings[r.key] = decrypt(r.value));
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', requireAuth, async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      const encryptedValue = encrypt(String(value));
      await dbAsync.run(
        'INSERT OR REPLACE INTO settings (user_id, key, value) VALUES (?, ?, ?)',
        [req.userId, key, encryptedValue]
      );
    }
    await initScheduler();
    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/rebook-logs', requireAuth, async (req, res) => {
  try {
    const logs = await dbAsync.all(`
      SELECT rl.*, f.flight_number, f.confirmation_code, f.origin, f.destination
      FROM rebook_logs rl
      JOIN flights f ON rl.flight_id = f.id
      WHERE rl.user_id = ?
      ORDER BY rl.rebooked_at DESC
    `, [req.userId]);

    const decryptedLogs = logs.map(l => ({
      ...l,
      confirmation_code: decrypt(l.confirmation_code)
    }));

    res.json({ success: true, logs: decryptedLogs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback route to serve React app
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start Express server, daily scheduler, and burner email poller
app.listen(PORT, async () => {
  console.log(`🚀 Delta FareGuard Server running at http://localhost:${PORT}`);
  await initScheduler();
  initEmailPoller();
});
