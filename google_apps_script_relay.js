/**
 * 🔒 Delta FareGuard - Zero-Trust Gmail Webhook Relay (Google Apps Script)
 * 
 * Instructions:
 * 1. Open https://script.google.com and click "New Project".
 * 2. Paste this code into the editor.
 * 3. Replace YOUR_FAREGUARD_SERVER_URL with your live server URL (e.g., https://delta-fareguard.onrender.com).
 * 4. Set a Time-driven trigger to run "syncDeltaReceipts" every 15 minutes.
 * 
 * Security Guarantee:
 * - This script runs ENTIRELY inside your personal Google account.
 * - Your Delta FareGuard server NEVER receives your Gmail password, OAuth refresh tokens, or access to non-Delta emails.
 */

const FAREGUARD_SERVER_URL = "https://YOUR_FAREGUARD_SERVER_URL/api/receipts/import";

function syncDeltaReceipts() {
  // Search strictly for Delta ticket confirmation emails
  const threads = GmailApp.search('from:ticketreceipt@delta.com subject:"Flight Confirmation" is:unread', 0, 5);
  
  for (let i = 0; i < threads.length; i++) {
    const messages = threads[i].getMessages();
    for (let j = 0; j < messages.length; j++) {
      const msg = messages[j];
      if (msg.isUnread()) {
        const bodyText = msg.getPlainBody();
        
        // Send payload strictly containing Delta ticket text to your private server
        const options = {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ receiptText: bodyText })
        };

        try {
          const response = UrlFetchApp.fetch(FAREGUARD_SERVER_URL, options);
          Logger.log("Forwarded Delta receipt to FareGuard: " + response.getContentText());
          msg.markRead(); // Mark as read so it won't re-send
        } catch (err) {
          Logger.log("Error forwarding receipt: " + err.toString());
        }
      }
    }
  }
}
