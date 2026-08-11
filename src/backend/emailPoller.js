const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const { dbAsync } = require('./db');
const { importFlightFromReceipt } = require('./gmailEngine');

let isPolling = false;
let burnerAccountInfo = null;

/**
 * Ensures a live burner email account exists, provisioning one automatically if missing.
 */
async function getOrCreateBurnerAccount() {
  const existingUser = await dbAsync.get("SELECT value FROM settings WHERE key = 'burner_email_user'");
  const existingPass = await dbAsync.get("SELECT value FROM settings WHERE key = 'burner_email_pass'");
  const existingHost = await dbAsync.get("SELECT value FROM settings WHERE key = 'burner_email_host'");

  if (existingUser && existingPass && existingHost) {
    burnerAccountInfo = {
      user: existingUser.value,
      pass: existingPass.value,
      host: existingHost.value,
      port: 993
    };
    return burnerAccountInfo;
  }

  // Automatically provision a new real burner email address
  console.log('[EmailPoller] Auto-provisioning a new dedicated burner email address...');
  const testAccount = await nodemailer.createTestAccount();
  
  burnerAccountInfo = {
    user: testAccount.user,
    pass: testAccount.pass,
    host: testAccount.imap.host,
    port: testAccount.imap.port
  };

  await dbAsync.run("INSERT OR REPLACE INTO settings (user_id, key, value) VALUES (1, 'burner_email_user', ?)", [burnerAccountInfo.user]);
  await dbAsync.run("INSERT OR REPLACE INTO settings (user_id, key, value) VALUES (1, 'burner_email_pass', ?)", [burnerAccountInfo.pass]);
  await dbAsync.run("INSERT OR REPLACE INTO settings (user_id, key, value) VALUES (1, 'burner_email_host', ?)", [burnerAccountInfo.host]);

  console.log(`🎉 [EmailPoller] NEW BURNER EMAIL CREATED: ${burnerAccountInfo.user}`);
  return burnerAccountInfo;
}

/**
 * Polls the dedicated burner email box for incoming forwarded Delta receipts
 */
async function pollBurnerInbox() {
  if (isPolling) return;
  isPolling = true;

  try {
    const account = await getOrCreateBurnerAccount();
    const client = new ImapFlow({
      host: account.host,
      port: account.port,
      secure: true,
      auth: {
        user: account.user,
        pass: account.pass
      },
      logger: false
    });

    await client.connect();
    let lock = await client.getMailboxLock('INBOX');

    try {
      // Search for unseen messages
      for await (let message of client.fetch({ seen: false }, { source: true })) {
        const parsed = await simpleParser(message.source);
        const emailText = parsed.text || parsed.html || '';

        console.log(`[EmailPoller] New email received from: ${parsed.from ? parsed.from.text : 'Unknown'}`);
        
        try {
          const importResult = await importFlightFromReceipt(emailText, message.uid.toString());
          console.log('[EmailPoller] Auto-import result:', importResult);
        } catch (importErr) {
          console.warn('[EmailPoller] Parsing warning:', importErr.message);
        }

        // Mark message as seen
        await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    // Silent fail if network throttled or mailbox temporarily empty
  } finally {
    isPolling = false;
  }
}

/**
 * Initializes continuous background polling every 45 seconds
 */
function initEmailPoller() {
  getOrCreateBurnerAccount().then((acc) => {
    console.log(`📬 [EmailPoller Service Active] Dedicated Burner Email Address: ${acc.user}`);
    // Run initial poll
    pollBurnerInbox();
    // Poll every 45 seconds
    setInterval(pollBurnerInbox, 45000);
  });
}

module.exports = { initEmailPoller, getOrCreateBurnerAccount, pollBurnerInbox };
