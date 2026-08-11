import React, { useState } from 'react';

export default function FlightCard({ flight, onCheckPrice, onRebook, onDelete, onToggleAutoRebook }) {
  const [checking, setChecking] = useState(false);
  const [rebooking, setRebooking] = useState(false);

  const isMiles = flight.payment_type === 'MILES';
  const pricePaid = flight.price_paid || 0;
  const milesPaid = flight.miles_paid || 0;

  const currentLowestPrice = flight.current_lowest_price || pricePaid;
  const currentLowestMiles = flight.current_lowest_miles || milesPaid;

  const savingsCash = Math.max(0, pricePaid - currentLowestPrice);
  const savingsMiles = Math.max(0, milesPaid - currentLowestMiles);

  const hasDrop = isMiles ? (currentLowestMiles < milesPaid) : (currentLowestPrice < pricePaid);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await onCheckPrice(flight.id);
    } finally {
      setChecking(false);
    }
  };

  const handleRebook = async () => {
    setRebooking(true);
    try {
      await onRebook(flight.id);
    } finally {
      setRebooking(false);
    }
  };

  return (
    <div className="flight-card">
      <div className="flight-row-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="pnr-tag">PNR: {flight.confirmation_code}</span>
          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {flight.passenger_last_name}
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '0.1rem 0.4rem',
              border: '1px solid #1a1a1a',
              background: isMiles ? '#f3e8ff' : '#dcfce7',
              color: isMiles ? '#6b21a8' : '#15803d'
            }}
          >
            {isMiles ? '🪙 SKYMILES' : '💵 CASH'}
          </span>
        </div>

        <button
          className="btn btn-sm"
          style={{ padding: '0.15rem 0.4rem', background: '#fee2e2', color: '#b91c1c' }}
          onClick={() => onDelete(flight.id)}
          title="Delete Flight"
        >
          ✕ Delete
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="flight-route-display">
            <span className="city-code">{flight.origin}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>➔</span>
            <span className="city-code">{flight.destination}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#555' }}>
              ({flight.flight_number})
            </span>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#555' }}>
            📅 {flight.departure_date} &bull; Class: {flight.fare_class}
            {isMiles && flight.has_takeoff_15 === 1 && (
              <span style={{ marginLeft: '0.5rem', color: '#1d4ed8', fontWeight: 700 }}>
                [💳 Take Off 15% Active]
              </span>
            )}
          </div>
        </div>

        <div className="pricing-block">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>
              {isMiles ? 'Paid' : 'Price Paid'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, textDecoration: hasDrop ? 'line-through' : 'none' }}>
              {isMiles ? `${milesPaid.toLocaleString()} Mi` : `$${pricePaid.toFixed(2)}`}
            </div>
          </div>

          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>
              Current
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: hasDrop ? '#15803d' : '#1a1a1a' }}>
              {isMiles ? `${currentLowestMiles.toLocaleString()} Mi` : `$${currentLowestPrice.toFixed(2)}`}
            </div>
          </div>

          {hasDrop ? (
            <div className="drop-pill">
              {isMiles ? `-${savingsMiles.toLocaleString()} Mi` : `-$${savingsCash.toFixed(2)}`}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#777', fontStyle: 'italic' }}>
              No drop
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #eee' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#777' }}>
          Last checked: {flight.last_checked ? new Date(flight.last_checked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={flight.auto_rebook === 1}
              onChange={(e) => onToggleAutoRebook(flight.id, e.target.checked)}
            />
            Auto-Rebook @ 9 AM
          </label>

          <button className="btn btn-sm" onClick={handleCheck} disabled={checking}>
            {checking ? 'Checking...' : '🔄 Check'}
          </button>

          <button className={`btn btn-sm ${hasDrop ? 'btn-success' : 'btn-primary'}`} onClick={handleRebook} disabled={rebooking}>
            ⚡ {rebooking ? 'Opening...' : (hasDrop ? 'Rebook & Save' : 'Test Rebook')}
          </button>
        </div>
      </div>
    </div>
  );
}
