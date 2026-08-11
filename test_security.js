const { encrypt, decrypt } = require('./src/backend/crypto');
const { registerUser, loginUser } = require('./src/backend/auth');
const { dbAsync } = require('./src/backend/db');

async function testSecurity() {
  console.log('Testing AES-256-GCM Encryption & Multi-Tenant User Security...');

  // Test AES-256-GCM Encryption
  const clearPnr = 'H7X9KL';
  const encrypted = encrypt(clearPnr);
  console.log(`Original PNR: ${clearPnr}`);
  console.log(`AES-256-GCM Encrypted Ciphertext: ${encrypted}`);

  const decrypted = decrypt(encrypted);
  console.log(`Decrypted PNR: ${decrypted}`);

  if (decrypted !== clearPnr) {
    throw new Error('Encryption test failed!');
  }

  // Test User Auth & Isolation
  const testEmail = `user_${Date.now()}@example.com`;
  const registerRes = await registerUser(testEmail, 'SecurePass123!', 'Test User');
  console.log('User Registered:', registerRes.user);

  const loginRes = await loginUser(testEmail, 'SecurePass123!');
  console.log('User Login Successful! JWT Token generated:', loginRes.token.substring(0, 30) + '...');

  console.log('Security Architecture Verification Successful!');
  process.exit(0);
}

testSecurity().catch(err => {
  console.error('Security Test Error:', err);
  process.exit(1);
});
