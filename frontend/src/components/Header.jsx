import { 
  Fuel, 
  Compass, 
  LayoutDashboard, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle,
  Layers
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  backendStatus, 
  onRefreshHealth, 
  isRefreshing 
}) {
  return (
    <header className="header-container">
      {/* Prototype Simulated Data Disclaimer Banner */}
      <div className="disclaimer-banner">
        <div className="disclaimer-content">
          <div className="disclaimer-badge">
            <AlertTriangle size={13} className="disclaimer-icon" />
            <span>PROTOTYPE — SIMULATED DATA</span>
          </div>
          <span className="disclaimer-text">
            Kegalle prototype scenario. Fictional fuel availability & synthetic ML queue predictions. Not live GPS or certified refinery inventory.
          </span>
        </div>
        <div className="system-pill">
          <Layers size={13} />
          <span>3 Stations • 9 Pumps • 200 Sim Vehicles</span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="navbar">
        <div className="brand-section">
          <div className="brand-logo">
            <Fuel className="brand-icon" size={26} />
            <span className="pulse-indicator" />
          </div>
          <div>
            <div className="brand-title-row">
              <span className="brand-name">FuelFlow</span>
              <span className="brand-ai">AI</span>
              <span className="prototype-pill">v1.0-PROTO</span>
            </div>
            <p className="brand-tagline">Intelligent Fuel Station Discovery & Smart Pump Allocation</p>
          </div>
        </div>

        {/* Portal Switcher Tabs */}
        <div className="tab-switcher" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'driver'}
            className={`tab-btn ${activeTab === 'driver' ? 'active' : ''}`}
            onClick={() => setActiveTab('driver')}
          >
            <Compass size={17} />
            <div className="tab-text-group">
              <span className="tab-title">Driver Portal</span>
              <span className="tab-sub">Discovery & Wait Times</span>
            </div>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'manager'}
            className={`tab-btn ${activeTab === 'manager' ? 'active' : ''}`}
            onClick={() => setActiveTab('manager')}
          >
            <LayoutDashboard size={17} />
            <div className="tab-text-group">
              <span className="tab-title">Manager Portal</span>
              <span className="tab-sub">Operations & Smart Allocation</span>
            </div>
          </button>
        </div>

        {/* System & Backend Status Controls */}
        <div className="status-controls">
          <div 
            className={`status-pill ${backendStatus.online ? 'online' : 'demo'}`}
            title={`Backend: ${backendStatus.url || 'http://localhost:8000'}`}
          >
            {backendStatus.online ? (
              <>
                <Wifi size={14} className="status-icon" />
                <span className="status-dot green" />
                <span className="status-label">Backend Online</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="status-icon" />
                <span className="status-dot amber" />
                <span className="status-label">Demo Simulation</span>
              </>
            )}
          </div>

          <button
            className="refresh-btn"
            onClick={onRefreshHealth}
            disabled={isRefreshing}
            title="Check backend health (http://localhost:8000)"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
            <span>{isRefreshing ? 'Pinging...' : 'Sync'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
