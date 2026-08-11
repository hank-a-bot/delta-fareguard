const nodemailer = require('nodemailer');
const { dbAsync } = require('./db');

async function getNotificationSettings() {
  const settings = await dbAsync.all('SELECT * FROM settings');
  const config = {};
  settings.forEach(s => config[s.key] = s.value);
  return config;
}

async function sendNotification({ subject, text, html }) {
  try {
    const settings = await getNotificationSettings();
    console.log(`[Notifier] Notification Alert: ${subject}`);

    // If Email Notifications enabled
    if (settings.email_notifications === 'true' && settings.email_to && settings.smtp_host) {
      const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port || '587'),
        secure: settings.smtp_secure === 'true',
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_pass
        }
      });

      await transporter.sendMail({
        from: `"Delta FareGuard" <${settings.smtp_user}>`,
        to: settings.email_to,
        subject,
        text,
        html
      });
      console.log(`[Notifier] Email notification sent to ${settings.email_to}`);
    }

    // Telegram Bot notification if token configured
    if (settings.telegram_bot_token && settings.telegram_chat_id) {
      const axios = require('axios');
      const telegramUrl = `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`;
      await axios.post(telegramUrl, {
        chat_id: settings.telegram_chat_id,
        text: `✈️ *Delta FareGuard Alert*\n\n${text}`,
        parse_mode: 'Markdown'
      });
      console.log('[Notifier] Telegram notification sent.');
    }
  } catch (err) {
    console.error('[Notifier Error] Failed to send notification:', err.message);
  }
}

module.exports = { sendNotification, getNotificationSettings };
