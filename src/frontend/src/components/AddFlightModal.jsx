import React, { useState } from 'react';

export default function AddFlightModal({ isOpen, onClose, onAddFlight }) {
  const [formData, setFormData] = useState({
    confirmation_code: '',
    passenger_first_name: '',
    passenger_last_name: '',
    flight_number: 'DL ',
    origin: '',
    destination: '',
    departure_date: '',
    fare_class: 'Main Cabin',
    payment_type: 'CASH',
    price_paid: '',
    miles_paid: '',
    has_takeoff_15: true,
    auto_rebook: true
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAddFlight(formData);
      onClose();
    } catch (err) {
      alert('Error adding flight: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontFamily: 'var(--font-mono)' }}>+ TRACK NEW DELTA FLIGHT</h3>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Payment Type</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.2rem' }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="payment_type"
                  value="CASH"
                  checked={formData.payment_type === 'CASH'}
                  onChange={e => setFormData({ ...formData, payment_type: e.target.value })}
                /> 💵 Cash ($ USD)
              </label>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="payment_type"
                  value="MILES"
                  checked={formData.payment_type === 'MILES'}
                  onChange={e => setFormData({ ...formData, payment_type: e.target.value })}
                /> 🪙 SkyMiles
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Confirmation Code (PNR) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. H7X9KL"
                maxLength={6}
                required
                value={formData.confirmation_code}
                onChange={e => setFormData({ ...formData, confirmation_code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="form-group">
              <label>Flight Number *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. DL 1452"
                required
                value={formData.flight_number}
                onChange={e => setFormData({ ...formData, flight_number: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Passenger First Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. John"
                value={formData.passenger_first_name}
                onChange={e => setFormData({ ...formData, passenger_first_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Passenger Last Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Smith"
                required
                value={formData.passenger_last_name}
                onChange={e => setFormData({ ...formData, passenger_last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Origin Airport *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. JFK"
                maxLength={3}
                required
                value={formData.origin}
                onChange={e => setFormData({ ...formData, origin: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="form-group">
              <label>Destination Airport *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. LAX"
                maxLength={3}
                required
                value={formData.destination}
                onChange={e => setFormData({ ...formData, destination: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Departure Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={formData.departure_date}
                onChange={e => setFormData({ ...formData, departure_date: e.target.value })}
              />
            </div>

            {formData.payment_type === 'MILES' ? (
              <div className="form-group">
                <label>SkyMiles Paid *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 35000"
                  required
                  value={formData.miles_paid}
                  onChange={e => setFormData({ ...formData, miles_paid: e.target.value })}
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Price Paid ($ USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="e.g. 450.00"
                  required
                  value={formData.price_paid}
                  onChange={e => setFormData({ ...formData, price_paid: e.target.value })}
                />
              </div>
            )}
          </div>

          {formData.payment_type === 'MILES' && (
            <div className="form-group" style={{ background: '#f3f3ee', padding: '0.6rem', border: '1px solid #1a1a1a' }}>
              <label style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none' }}>
                <input
                  type="checkbox"
                  checked={formData.has_takeoff_15}
                  onChange={e => setFormData({ ...formData, has_takeoff_15: e.target.checked })}
                />
                💳 Delta SkyMiles Amex Cardholder (Apply "Take Off 15%" Award Discount)
              </label>
            </div>
          )}

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none' }}>
              <input
                type="checkbox"
                checked={formData.auto_rebook}
                onChange={e => setFormData({ ...formData, auto_rebook: e.target.checked })}
              />
              Enable Automatic Rebooking on Fare Drop (at 9:00 AM)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Start Tracking Flight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
