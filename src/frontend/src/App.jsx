import React, { useState, useEffect } from 'react';
import FlightCard from './components/FlightCard';
import AddFlightModal from './components/AddFlightModal';
import ImportReceiptModal from './components/ImportReceiptModal';
import SettingsModal from './components/SettingsModal';
import RebookLogsModal from './components/RebookLogsModal';

export default function App() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingAll, setCheckingAll] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const token = localStorage.getItem('token') || 'demo-token';

  useEffect(() => {
    fetchFlights();
  }, []);

  const fetchFlights = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flights', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFlights(data.flights);
      }
    } catch (err) {
      console.error('Failed to fetch flights:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPrice = async (id) => {
    try {
      const res = await fetch(`/api/flights/${id}/check`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchFlights();
      }
    } catch (err) {
      alert(`Price check failed: ${err.message}`);
    }
  };

  const handleCheckAll = async () => {
    setCheckingAll(true);
    try {
      await fetch('/api/check-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setTimeout(() => {
        fetchFlights();
        setCheckingAll(false);
      }, 2000);
    } catch (err) {
      setCheckingAll(false);
    }
  };

  const handleDeleteFlight = async (id) => {
    if (!window.confirm('Are you sure you want to stop tracking this flight?')) return;
    try {
      await fetch(`/api/flights/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setFlights(flights.filter(f => f.id !== id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleToggleAutoRebook = async (id, currentVal) => {
    try {
      await fetch(`/api/flights/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ auto_rebook: currentVal ? 1 : 0 })
      });
      fetchFlights();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  // Calculations
  const totalCashSavings = flights.reduce((sum, f) => {
    if (f.payment_type !== 'MILES' && f.current_lowest_price && f.current_lowest_price < f.price_paid) {
      return sum + (f.price_paid - f.current_lowest_price);
    }
    return sum;
  }, 0);

  const totalMilesSavings = flights.reduce((sum, f) => {
    if (f.payment_type === 'MILES' && f.current_lowest_miles && f.current_lowest_miles < f.miles_paid) {
      return sum + (f.miles_paid - f.current_lowest_miles);
    }
    return sum;
  }, 0);

  return (
    <div className="container">
      {/* Header */}
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            ✈️ DELTA FAREGUARD <span className="version-badge">v1.0</span>
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#555' }}>
            Daily 9:00 AM Delta Fare Tracker & Auto-Rebook Engine
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowReceiptModal(true)}>
            ✉️ Paste Receipt
          </button>
          <button className="btn btn-secondary" onClick={handleCheckAll} disabled={checkingAll}>
            {checkingAll ? 'Checking All...' : '🔄 Check All Prices'}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowLogsModal(true)}>
            📋 Logs
          </button>
          <button className="btn btn-secondary" onClick={() => setShowSettingsModal(true)}>
            ⚙️ Settings
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Flight
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card stat-card">
          <div className="stat-label">Potential Cash Savings</div>
          <div className="stat-value text-green">${totalCashSavings.toFixed(2)}</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">SkyMiles Award Savings</div>
          <div className="stat-value text-purple">{totalMilesSavings.toLocaleString()} Mi</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">Tracked Reservations</div>
          <div className="stat-value">{flights.length}</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">Daily Auto Check</div>
          <div className="stat-value">9:00 AM</div>
        </div>
      </div>

      {/* Tracked Flights Section */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Tracked Reservations ({flights.length})</h2>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#666' }}>
            Main Cabin cash & award tickets allow fee-free rebooking
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            Loading active reservations...
          </div>
        ) : flights.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>No flights currently tracked</h3>
            <p style={{ margin: '0 0 1.5rem 0', fontFamily: 'var(--font-mono)', color: '#666' }}>
              Click "Paste Receipt" to import a confirmation email, or manually add your flight.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowReceiptModal(true)}>
                ✉️ Paste Receipt
              </button>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                + Add Flight Manually
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {flights.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                onCheckPrice={handleCheckPrice}
                onDelete={handleDeleteFlight}
                onToggleAutoRebook={handleToggleAutoRebook}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {showAddModal && (
        <AddFlightModal
          onClose={() => setShowAddModal(false)}
          onFlightAdded={() => {
            setShowAddModal(false);
            fetchFlights();
          }}
        />
      )}

      {showReceiptModal && (
        <ImportReceiptModal
          onClose={() => setShowReceiptModal(false)}
          onReceiptImported={() => {
            setShowReceiptModal(false);
            fetchFlights();
          }}
        />
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {showLogsModal && (
        <RebookLogsModal onClose={() => setShowLogsModal(false)} />
      )}
    </div>
  );
}
