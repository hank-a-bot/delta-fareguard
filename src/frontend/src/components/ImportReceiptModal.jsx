import React, { useState } from 'react';

export default function ImportReceiptModal({ isOpen, onClose, onImportSuccess }) {
  const [receiptText, setReceiptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleImport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/receipts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptText })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to parse Delta receipt email.');
      }
      alert(`🎉 Successfully imported Delta PNR: ${data.flight.confirmation_code} (${data.flight.origin} ➔ ${data.flight.destination})!`);
      setReceiptText('');
      onImportSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontFamily: 'var(--font-mono)' }}>✉️ IMPORT DELTA E-RECEIPT EMAIL</h3>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: '0.82rem', color: '#555', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
          Paste raw text or HTML from ticketreceipt@delta.com. Delta FareGuard will parse PNR, route, passenger name, and payment (Cash / SkyMiles).
        </p>

        {error && (
          <div style={{ padding: '0.5rem 0.75rem', background: '#fee2e2', border: '1.5px solid #b91c1c', borderRadius: '2px', color: '#b91c1c', fontSize: '0.8rem', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleImport}>
          <div className="form-group">
            <textarea
              className="form-input"
              rows={8}
              placeholder="Paste raw email text here... (e.g. Confirmation Code: H7X9KL, Passenger: John Smith, DL 1452 JFK to LAX, Total: 35,000 SkyMiles)"
              value={receiptText}
              onChange={e => setReceiptText(e.target.value)}
              required
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !receiptText.trim()}>
              {loading ? 'Parsing...' : 'Auto-Import Flight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
