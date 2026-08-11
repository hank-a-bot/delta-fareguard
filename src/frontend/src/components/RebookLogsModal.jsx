import React from 'react';

export default function RebookLogsModal({ isOpen, onClose, logs }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontFamily: 'var(--font-mono)' }}>📋 REBOOK EXECUTION & REFUND HISTORY</h3>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontFamily: 'var(--font-mono)' }}>
              No rebook actions recorded yet. When a price drop occurs, details will be logged here.
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                style={{
                  background: '#f3f3ee',
                  border: '1.5px solid #1a1a1a',
                  borderRadius: '2px',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.75rem',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 700 }}>
                    ✈️ {log.flight_number} ({log.origin} ➔ {log.destination}) - PNR: {log.confirmation_code}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.35rem',
                      border: '1px solid #1a1a1a',
                      background: log.status.includes('SUCCESS') || log.status.includes('GUIDED') ? '#dcfce7' : '#fee2e2',
                      color: log.status.includes('SUCCESS') || log.status.includes('GUIDED') ? '#15803d' : '#b91c1c'
                    }}
                  >
                    {log.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#333', marginBottom: '0.3rem', display: 'flex', gap: '1rem' }}>
                  <span>Original: <s>${log.original_price.toFixed(2)}</s></span>
                  <span>New: <b>${log.new_price.toFixed(2)}</b></span>
                  <span>Refunded: <b style={{ color: '#15803d' }}>+${log.refund_amount.toFixed(2)}</b></span>
                </div>

                <p style={{ fontSize: '0.75rem', color: '#555' }}>
                  {log.log_details}
                </p>

                <div style={{ fontSize: '0.68rem', color: '#777', marginTop: '0.3rem' }}>
                  🕒 {new Date(log.rebooked_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
