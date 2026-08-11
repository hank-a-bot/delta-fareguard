import React, { useState, useEffect } from 'react';

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings }) {
  const [formData, setFormData] = useState({
    cron_schedule: '0 9 * * *',
    serp_api_key: '',
    has_delta_amex_card: true,
    email_notifications: false,
    email_to: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    telegram_bot_token: '',
    telegram_chat_id: ''
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        cron_schedule: settings.cron_schedule || '0 9 * * *',
        serp_api_key: settings.serp_api_key || '',
        has_delta_amex_card: settings.has_delta_amex_card !== 'false',
        email_notifications: settings.email_notifications === 'true',
        email_to: settings.email_to || '',
        smtp_host: settings.smtp_host || 'smtp.gmail.com',
        smtp_port: settings.smtp_port || '587',
        smtp_user: settings.smtp_user || '',
        smtp_pass: settings.smtp_pass || '',
        telegram_bot_token: settings.telegram_bot_token || '',
        telegram_chat_id: settings.telegram_chat_id || ''
      });
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSaveSettings(formData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontFamily: 'var(--font-mono)' }}>⚙️ SCHEDULE & SETTINGS</h3>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Automated Check Schedule (Cron Expression)</label>
            <input
              type="text"
              className="form-input"
              value={formData.cron_schedule}
              onChange={e => setFormData({ ...formData, cron_schedule: e.target.value })}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#666', marginTop: '0.2rem', display: 'block' }}>
              Default: <code>0 9 * * *</code> (Every day at 9:00 AM local time).
            </span>
          </div>

          <div className="form-group" style={{ background: '#f3f3ee', padding: '0.75rem', border: '1.5px solid #1a1a1a' }}>
            <label style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none', fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={formData.has_delta_amex_card}
                onChange={e => setFormData({ ...formData, has_delta_amex_card: e.target.checked })}
              />
              💳 Delta SkyMiles Amex Credit Cardholder ("Take Off 15%")
            </label>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#555', marginTop: '0.2rem', display: 'block' }}>
              Applies 15% discount factor to award ticket price checks.
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label>Optional SerpAPI Key (Google Flights API)</label>
            <input
              type="password"
              className="form-input"
              placeholder="Paste SerpAPI key if available"
              value={formData.serp_api_key}
              onChange={e => setFormData({ ...formData, serp_api_key: e.target.value })}
            />
          </div>

          <hr style={{ borderColor: '#1a1a1a', margin: '1rem 0' }} />

          <div className="form-group">
            <label style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none' }}>
              <input
                type="checkbox"
                checked={formData.email_notifications}
                onChange={e => setFormData({ ...formData, email_notifications: e.target.checked })}
              />
              ✉️ Send Email Alerts on Price Drop / Rebook
            </label>
          </div>

          {formData.email_notifications && (
            <div className="form-row">
              <div className="form-group">
                <label>Send Alert Emails To</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="user@example.com"
                  value={formData.email_to}
                  onChange={e => setFormData({ ...formData, email_to: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>SMTP User / Email</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="smtp.user@gmail.com"
                  value={formData.smtp_user}
                  onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
}
