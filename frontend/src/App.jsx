import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import DriverPortal from './components/DriverPortal';
import ManagerPortal from './components/ManagerPortal';
import { getHealth, getStations } from './services/api';
import { INITIAL_STATIONS } from './data/demoData';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('driver'); // 'driver' | 'manager'
  const [stations, setStations] = useState(INITIAL_STATIONS);
  const [backendStatus, setBackendStatus] = useState({
    online: false,
    checkedAt: null,
    isDemo: true,
    url: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  });
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [systemNotice, setSystemNotice] = useState(null);

  // Health and stations sync function
  const checkBackendAndSync = useCallback(async () => {
    setIsRefreshingHealth(true);
    try {
      const health = await getHealth();
      const stationRes = await getStations();

      setBackendStatus({
        online: health.online,
        checkedAt: new Date().toLocaleTimeString(),
        isDemo: !health.online,
        url: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      });

      if (stationRes.stations && stationRes.stations.length > 0) {
        setStations(stationRes.stations);
      }

      if (!health.online) {
        setSystemNotice({
          type: 'info',
          message: 'Backend server at http://localhost:8000 is not reachable. Operating in prototype demo mode with realistic simulated data.'
        });
      } else {
        setSystemNotice(null);
      }
    } catch {
      setBackendStatus({
        online: false,
        checkedAt: new Date().toLocaleTimeString(),
        isDemo: true,
        url: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      });
    } finally {
      setIsRefreshingHealth(false);
    }
  }, []);

  // Sync on startup safely
  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!ignore) {
        await checkBackendAndSync();
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [checkBackendAndSync]);

  return (
    <div className="app-shell">
      {/* Top Header with Prototype Banner and Portal Switcher */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendStatus={backendStatus}
        onRefreshHealth={checkBackendAndSync}
        isRefreshing={isRefreshingHealth}
      />

      {/* Optional System Notice */}
      {systemNotice && (
        <div className="system-notice-strip">
          <div className="notice-content">
            <span className="notice-badge">NOTE</span>
            <span className="notice-text">{systemNotice.message}</span>
          </div>
          <button className="notice-dismiss" onClick={() => setSystemNotice(null)}>✕</button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'driver' ? (
          <DriverPortal
            stations={stations}
          />
        ) : (
          <ManagerPortal
            stations={stations}
            onUpdateStations={setStations}
          />
        )}
      </main>

      {/* Professional SaaS Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-left">
            <div className="footer-brand">
              <strong>FuelFlow AI</strong>
              <span className="footer-sep">•</span>
              <span>Intelligent Fuel Station Discovery & Smart Pump Allocation</span>
            </div>
            <p className="footer-disclaimer">
              Built for Hackathon Demonstration. Prototype scenario based on Kegalle transport corridor. All queues, pump allocations, and journey durations are simulated.
            </p>
          </div>
          <div className="footer-right">
            <div className="footer-badges">
              <span className="badge-tag">React 19</span>
              <span className="badge-tag">Vite</span>
              <span className="badge-tag">Recharts</span>
              <span className="badge-tag">Lucide</span>
            </div>
            <span className="footer-copyright">© 2026 FuelFlow AI Team</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
