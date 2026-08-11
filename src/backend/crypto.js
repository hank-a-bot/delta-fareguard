const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
// Default fallback key derived if ENCRYPTION_SECRET is not provided in env
const SECRET_KEY = process.env.ENCRYPTION_SECRET || 'delta_fareguard_secure_master_key_2026_x9k2';
const KEY_BUFFER = crypto.scryptSync(SECRET_KEY, 'delta_salt_secure_2026', 32);

/**
 * Encrypts cleartext into AES-256-GCM ciphertext format: iv:authTag:encryptedHex
 */
function encrypt(text) {
  if (!text || typeof text !== 'string') return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM ciphertext format back to cleartext
 */
function decrypt(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.includes(':')) return ciphertext;
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // Return original if decryption fails (backwards compatibility)
    return ciphertext;
  }
}

module.exports = { encrypt, decrypt };
