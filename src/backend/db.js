const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../delta_fareguard.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err);
  } else {
    console.log(`Connected to SQLite database at: ${DB_PATH}`);
  }
});

// Initialize database schema
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT '',
      webhook_secret TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default primary user for zero-config local desktop mode
  db.run(`
    INSERT OR IGNORE INTO users (id, email, password_hash, name)
    VALUES (1, 'owner@local.host', '$2a$12$KIXz8/OQf7hF2B5Q2vYpReG1K1eW5b5.QnF0a5A4B3C2D1E0F', 'Primary User')
  `);

  // Flights table
  db.run(`
    CREATE TABLE IF NOT EXISTS flights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      confirmation_code TEXT NOT NULL,
      passenger_first_name TEXT DEFAULT '',
      passenger_last_name TEXT NOT NULL,
      flight_number TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      departure_date TEXT NOT NULL,
      fare_class TEXT DEFAULT 'Main Cabin',
      payment_type TEXT DEFAULT 'CASH',
      price_paid REAL DEFAULT 0,
      miles_paid INTEGER DEFAULT 0,
      has_takeoff_15 INTEGER DEFAULT 0,
      current_lowest_price REAL,
      current_lowest_miles INTEGER,
      last_checked TEXT,
      status TEXT DEFAULT 'TRACKING',
      auto_rebook INTEGER DEFAULT 1,
      gmail_msg_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Price history table
  db.run(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flight_id INTEGER NOT NULL,
      price REAL DEFAULT 0,
      miles INTEGER DEFAULT 0,
      checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      source TEXT DEFAULT 'DELTA_SCRAPER',
      savings REAL DEFAULT 0,
      miles_savings INTEGER DEFAULT 0,
      FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
    )
  `);

  // Rebook execution logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS rebook_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      flight_id INTEGER NOT NULL,
      original_price REAL NOT NULL,
      new_price REAL NOT NULL,
      refund_amount REAL NOT NULL,
      status TEXT NOT NULL,
      log_details TEXT,
      rebooked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Settings table (Migrate schema safely if older version existed)
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      user_id INTEGER DEFAULT 1,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (user_id, key)
    )
  `);
  db.run(`ALTER TABLE settings ADD COLUMN user_id INTEGER DEFAULT 1`, () => {});

  // Default global settings
  db.run(`INSERT OR IGNORE INTO settings (user_id, key, value) VALUES (1, 'cron_schedule', '0 9 * * *')`);
  db.run(`INSERT OR IGNORE INTO settings (user_id, key, value) VALUES (1, 'email_notifications', 'false')`);
  db.run(`INSERT OR IGNORE INTO settings (user_id, key, value) VALUES (1, 'has_delta_amex_card', 'true')`);
});

// Helper DB functions with Promises
const dbAsync = {
  all: (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  }),
  get: (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  }),
  run: (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
  })
};

module.exports = { db, dbAsync };
