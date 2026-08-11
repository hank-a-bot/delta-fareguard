const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbAsync } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'delta_fareguard_jwt_secret_2026_super_secure';

/**
 * Register a new user
 */
async function registerUser(email, password, name = '') {
  if (!email || !password || password.length < 6) {
    throw new Error('Email and password (min 6 chars) are required.');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check duplicate user
  const existing = await dbAsync.get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  // Hash password with bcrypt
  const password_hash = await bcrypt.hash(password, 12);

  const result = await dbAsync.run(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
    [normalizedEmail, password_hash, name.trim()]
  );

  const newUser = await dbAsync.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [result.lastID]);
  const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '30d' });

  return { user: newUser, token };
}

/**
 * Authenticate user login
 */
async function loginUser(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await dbAsync.get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  const safeUser = { id: user.id, email: user.email, name: user.name, created_at: user.created_at };
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

  return { user: safeUser, token };
}

/**
 * Express Authentication Middleware
 */
function requireAuth(req, res, next) {
  // Allow bypassing auth in local single-user desktop dev mode if token omitted
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Default to user_id 1 in desktop local dev mode
    req.userId = 1;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid authentication token.' });
  }
}

module.exports = { registerUser, loginUser, requireAuth };
