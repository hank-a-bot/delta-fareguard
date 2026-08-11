import React, { useState, useEffect } from 'react';
import FlightCard from './components/FlightCard';
import AddFlightModal from './components/AddFlightModal';
import SettingsModal from './components/SettingsModal';
import RebookLogsModal from './components/RebookLogsModal';
import ImportReceiptModal from './components/ImportReceiptModal';

const API_BASE = '/api';

export default function App() {
  const [flights, setFlights] = useState([]);
  const [settings, setSettings] = useState({});
  const [rebookLogs, setRebookLogs] = useState([]);
  const [burnerEmail, setBurnerEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingAll, setCheckingAll] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [flightsRes, settingsRes, logsRes, burnerRes] = await Promise.all([
        fetch(`${API_BASE}/flights`).then(r => r.json()),
        fetch(`${API_BASE}/settings`).then(r => r.json()),
        fetch(`${API_BASE}/rebook-logs`).then(r => r.json()),
        fetch(`${API_BASE}/burner-email`).then(r => r.json())
      ]);

      if (flightsRes.success) setFlights(flightsRes.flights || []);
      if (settingsRes.success) setSettings(settingsRes.settings || {});
      if (logsRes.success) setRebookLogs(logsRes.logs || []);
      if (burnerRes.success) setBurnerEmail(burnerRes.email || '');
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddFlight = async (flightData) => {
    const res = await fetch(`${API_BASE}/flights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flightData)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    fetchData();
  };

  const handleCheckPrice = async (flightId) => {
    const res = await fetch(`${API_BASE}/flights/${flightId}/check`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      fetchData();
    } else {
      alert('Error checking price: ' + data.error);
    }
  };

  const handleRebook = async (flightId) => {
    alert('Opening Delta Guided Auto-Rebook session in Playwright browser...');
    const res = await fetch(`${API_BASE}/flights/${flightId}/rebook`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      fetchData();
    } else {
      alert('Rebooking error: ' + data.error);
    }
  };

  const handleDeleteFlight = async (flightId) => {
    if (!confirm('Are you sure you want to remove this flight from tracking?')) return;
    await fetch(`${API_BASE}/flights/${flightId}`, { method: 'DELETE' });
    fetchData();
  };

  const handleToggleAutoRebook = async (flightId, autoRebook) => {
    await fetch(`${API_BASE}/flights/${flightId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_rebook: autoRebook })
    });
    fetchData();
  };

  const handleCheckAll = async () => {
    setCheckingAll(true);
    try {
      await fetch(`${API_BASE}/check-all`, { method: 'POST' });
      alert('Instant price check initiated for all active Delta flights!');
      setTimeout(fetchData, 3000);
    } finally {
      setCheckingAll(false);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });
    fetchData();
  };

  // Savings Metrics Calculation
  const totalCashSavings = flights.reduce((acc, f) => {
    if (f.payment_type === 'MILES') return acc;
    const curr = f.current_lowest_price || f.price_paid;
    return acc + Math.max(0, f.price_paid - curr);
  }, 0);

  const totalMilesSavings = flights.reduce((acc, f) => {
    if (f.payment_type !== 'MILES') return acc;
    const curr = f.current_lowest_miles || f.miles_paid;
    return acc + Math.max(0, f.miles_paid - curr);
  }, 0);

  const activeTrackingCount = flights.filter(f => f.status === 'TRACKING').length;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div>
          <div className="brand-title">
            <span>✈️ DELTA FAREGUARD</span>
            <span className="brand-badge">v1.0</span>
          </div>
          <div className="brand-subtitle">
            Daily 9:00 AM Delta Fare Tracker & Auto-Rebook Engine
          </div>
        </div>

        <div className="header-actions">
          <button className="btn" onClick={() => setIsImportModalOpen(true)}>
            ✉️ Paste Receipt
          </button>
          <button className="btn" onClick={handleCheckAll} disabled={checkingAll}>
            🔄 {checkingAll ? 'Checking...' : 'Check All Prices'}
          </button>
          <button className="btn" onClick={() => setIsLogsModalOpen(true)}>
            📋 Logs
          </button>
          <button className="btn" onClick={() => setIsSettingsModalOpen(true)}>
            ⚙️ Settings
          </button>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            + Add Flight
          </button>
        </div>
      </header>

      {/* Burner Email Banner */}
      {burnerEmail && (
        <div style={{ background: '#f3f3ee', border: '2px solid #1a1a1a', padding: '0.75rem 1rem', borderRadius: '2px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontFamily: 'var(--font-mono)' }}>
          <div>
            <span style={{ fontWeight: 700 }}>📬 YOUR DEDICATED BURNER EMAIL: </span>
            <code style={{ background: 'white', padding: '0.2rem 0.5rem', border: '1px solid #1a1a1a', fontWeight: 700, color: '#d92b2b' }}>
              {burnerEmail}
            </code>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#555' }}>
            Forward any Delta email receipt to this address to auto-track!
          </span>
        </div>
      )}

      {/* Flat Summary Stats Strip */}
      <div className="stats-strip">
        <div className="stat-item">
          <div className="stat-label">Potential Cash Savings</div>
          <div className="stat-value" style={{ color: totalCashSavings > 0 ? '#15803d' : 'inherit' }}>
            ${totalCashSavings.toFixed(2)}
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">SkyMiles Award Savings</div>
          <div className="stat-value" style={{ color: totalMilesSavings > 0 ? '#7c3aed' : 'inherit' }}>
            {totalMilesSavings.toLocaleString()} Mi
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Tracked Reservations</div>
          <div className="stat-value">{activeTrackingCount}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Daily Auto Check</div>
          <div className="stat-value" style={{ fontSize: '1.1rem', marginTop: '0.4rem' }}>
            9:00 AM
          </div>
        </div>
      </div>

      {/* Main Flights Section */}
      <main>
        <div className="section-title">
          <span>TRACKED RESERVATIONS ({flights.length})</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#666' }}>
            Main Cabin cash & award tickets allow fee-free rebooking
          </span>
        </div>

        {flights.length === 0 && !loading ? (
          <div className="empty-box">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✈️</div>
            <h3 style={{ marginBottom: '0.5rem' }}>No Tracked Flights Yet</h3>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Forward a Delta receipt to <code style={{ fontWeight: 700 }}>{burnerEmail}</code> or enter your Confirmation Code (PNR) to start.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn" onClick={() => setIsImportModalOpen(true)}>
                ✉️ Paste Receipt Email
              </button>
              <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                + Add Flight Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="flights-list">
            {flights.map(flight => (
              <FlightCard
                key={flight.id}
                flight={flight}
                onCheckPrice={handleCheckPrice}
                onRebook={handleRebook}
                onDelete={handleDeleteFlight}
                onToggleAutoRebook={handleToggleAutoRebook}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <AddFlightModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddFlight={handleAddFlight}
      />

      <ImportReceiptModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={fetchData}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      <RebookLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        logs={rebookLogs}
      />
    </div>
  );
}
