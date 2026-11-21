import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Play, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  Car, 
  Cpu, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Gauge,
  CheckCircle2,
  RefreshCw,
  Ticket,
  Search,
  Copy,
  Check,
  Info,
  ShieldCheck,
  Inbox
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  FUEL_TYPES, 
  STRATEGY_COMPARISON, 
  SAMPLE_ALLOCATION_LOG 
} from '../data/demoData';
import { runSimulation, compareStrategies, getQueueRegistrations } from '../services/api';

// Custom Tooltip declared outside of component render
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip-box">
        <p className="tooltip-title">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} className="tooltip-row" style={{ color: entry.color }}>
            <span className="tooltip-dot" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: <strong>{entry.value} {entry.unit || ''}</strong></span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function ManagerPortal({ stations, onUpdateStations }) {
  // Station selection for detailed pump monitoring
  const [selectedStationId, setSelectedStationId] = useState('A');
  
  // Simulation controls state
  const [vehicleCount, setVehicleCount] = useState(200);
  const [scenario, setScenario] = useState('normal'); // 'normal' | 'peak'
  const [seed, setSeed] = useState(42);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastSimResult, setLastSimResult] = useState(null);

  // Strategy comparison state
  const [comparisonData, setComparisonData] = useState(STRATEGY_COMPARISON);

  // Live Smart Allocation stream
  const [allocationLog, setAllocationLog] = useState(SAMPLE_ALLOCATION_LOG);

  // Load strategy comparison on mount & when vehicle count changes
  useEffect(() => {
    let isMounted = true;
    async function fetchComparison() {
      try {
        const res = await compareStrategies({ vehicle_count: vehicleCount, seed });
        if (isMounted && res) {
          setComparisonData(res);
        }
      } catch (err) {
        console.error('Comparison fetch failed, using fallback:', err);
      }
    }

    fetchComparison();
    return () => { isMounted = false; };
  }, [vehicleCount, seed]);

  // Handle Start Simulation
  const handleStartSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await runSimulation({
        vehicle_count: vehicleCount,
        scenario,
        seed
      });
      setLastSimResult(res);

      // If simulation returned updated station metrics, apply to stations state
      if (res.results?.station_metrics) {
        const metrics = res.results.station_metrics;
        const updated = stations.map(st => {
          const simSt = metrics[st.id];
          if (!simSt) return st;
          return {
            ...st,
            queue_length: simSt.queue_length ?? st.queue_length,
            predicted_wait_min: Math.round(simSt.avg_wait_min ?? st.predicted_wait_min),
            total_vehicles_served: simSt.vehicles_served ?? st.total_vehicles_served
          };
        });
        onUpdateStations(updated);
      }

      // Add a fresh dynamic log item representing new allocation batch
      const newLogItem = {
        id: `SIM-${Date.now().toString().slice(-4)}`,
        vehicle_id: `WP-${scenario === 'peak' ? 'PEAK' : 'FLOW'}-${Math.floor(1000 + Math.random() * 9000)}`,
        vehicle_type: scenario === 'peak' ? 'lorry' : 'car',
        fuel: scenario === 'peak' ? 'diesel' : 'petrol_92',
        assigned_station: selectedStationId,
        assigned_pump: scenario === 'peak' ? 'Pump 3' : 'Pump 1',
        reason: `Smart load balancing: ${scenario.toUpperCase()} batch redistributed to relieve Station B bottleneck`,
        saved_wait_min: +(4.5 + Math.random() * 6).toFixed(1),
        timestamp: 'Just now'
      };
      setAllocationLog(prev => [newLogItem, ...prev.slice(0, 5)]);

    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Reset to default configuration
  const handleReset = () => {
    setVehicleCount(200);
    setScenario('normal');
    setSeed(42);
    setLastSimResult(null);
  };

  // Current selected station
  const currentStation = stations.find(s => s.id === selectedStationId) || stations[0];

  // Virtual Queue Operations Hub State (v1.1 Portfolio Edition)
  const [queueRegistrations, setQueueRegistrations] = useState([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState(null);
  const [lastQueueRefresh, setLastQueueRefresh] = useState(null);
  const [filterStation, setFilterStation] = useState('ALL'); // 'ALL' | 'A' | 'B' | 'C'
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'WAITING' | 'SERVING' | 'COMPLETED' | 'CANCELLED'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRegId, setCopiedRegId] = useState(null);

  const fetchQueueRegistrations = useCallback(async () => {
    setIsLoadingQueue(true);
    setQueueError(null);
    try {
      const res = await getQueueRegistrations({ limit: 100 });
      if (res.success) {
        setQueueRegistrations(res.registrations);
        setLastQueueRefresh(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        setQueueError(res.error || 'Failed to fetch virtual queue registrations.');
      }
    } catch (err) {
      setQueueError(err.message || 'Network error fetching virtual queue data.');
    } finally {
      setIsLoadingQueue(false);
    }
  }, []);

useEffect(() => {
  const timer = setTimeout(() => {
    fetchQueueRegistrations();
  }, 0);

  return () => clearTimeout(timer);
}, [fetchQueueRegistrations]);

  const handleCopyRegId = (regId) => {
    navigator.clipboard?.writeText(regId);
    setCopiedRegId(regId);
    setTimeout(() => setCopiedRegId(null), 2000);
  };

  // Virtual Queue KPI counts
  const totalRegistrationsCount = queueRegistrations.length;
  const waitingCount = queueRegistrations.filter(r => r.status === 'WAITING').length;
  const servingCount = queueRegistrations.filter(r => r.status === 'SERVING').length;
  const completedCount = queueRegistrations.filter(r => r.status === 'COMPLETED').length;

  // Filtered registrations
  const filteredRegistrations = queueRegistrations.filter(r => {
    const matchesStation = filterStation === 'ALL' || r.station_id === filterStation;
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchesSearch = !searchQuery.trim() || 
      r.vehicle_number?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      r.registration_id?.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesStation && matchesStatus && matchesSearch;
  });

  // System aggregations
  const totalVehicles = vehicleCount;
  const totalActivePumps = stations.reduce((acc, st) => {
    return acc + (st.pumps?.filter(p => p.status === 'active').length ?? 3);
  }, 0);
  const totalPumps = stations.length * 3;
  const avgWaitTime = comparisonData?.overall?.smart_allocation?.avg_wait_min ?? 9.8;
  const maxWaitTime = comparisonData?.overall?.smart_allocation?.max_wait_min ?? 19.2;
  const totalServed = lastSimResult?.results?.vehicles_served ?? 170;

  return (
    <div className="portal-container manager-portal">
      {/* Station Selector Bar */}
      <section className="manager-station-selector">
        <div className="station-selector-header">
          <div className="title-group">
            <Activity className="section-icon emerald" size={20} />
            <div>
              <h2 className="section-title">Intelligent Fuel Station Operations Hub</h2>
              <p className="section-sub">
                Real-time pump telemetry, queue workloads, and AI pump allocation strategy vs Fixed FCFS.
              </p>
            </div>
          </div>
          <div className="station-tabs-group">
            {stations.map(st => (
              <button
                key={st.id}
                className={`station-tab-btn ${selectedStationId === st.id ? 'active' : ''}`}
                onClick={() => setSelectedStationId(st.id)}
              >
                <span className="tab-pill-id">Station {st.id}</span>
                <span className="tab-pill-queue">{st.queue_length} in queue</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* KPI Overview Metrics Bar */}
      <section className="kpi-metrics-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Simulated Vehicles</span>
            <Car size={16} className="text-cyan" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-cyan">{totalVehicles}</span>
            <span className="kpi-unit">TOTAL</span>
          </div>
          <span className="kpi-subtext">Across all 3 prototype stations</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Pumps</span>
            <Gauge size={16} className="text-emerald" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-emerald">{totalActivePumps} / {totalPumps}</span>
            <span className="kpi-badge in-service">Operational</span>
          </div>
          <span className="kpi-subtext">1 pump offline for inspection (Station B)</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Average Wait Time</span>
            <Clock size={16} className="text-emerald" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-emerald">{avgWaitTime}</span>
            <span className="kpi-unit">min</span>
            <span className="kpi-improvement-pill">
              <TrendingDown size={12} />
              -{comparisonData?.overall?.improvement?.wait_reduction_pct || 46.7}%
            </span>
          </div>
          <span className="kpi-subtext">Smart Allocation vs 18.4m FCFS</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Max Waiting Time</span>
            <AlertTriangle size={16} className="text-amber" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-amber">{maxWaitTime}</span>
            <span className="kpi-unit">min</span>
            <span className="kpi-improvement-pill">
              <TrendingDown size={12} />
              -{comparisonData?.overall?.improvement?.max_wait_reduction_pct || 49.5}%
            </span>
          </div>
          <span className="kpi-subtext">Peak wait capped under AI allocation</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Vehicles Served</span>
            <CheckCircle2 size={16} className="text-cyan" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value text-cyan">{totalServed}</span>
            <span className="kpi-unit">/ {totalVehicles}</span>
          </div>
          <span className="kpi-subtext">{Math.round((totalServed / totalVehicles) * 100)}% cycle clearance rate</span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* VIRTUAL QUEUE OPERATIONS HUB (v1.1 Portfolio Edition)                     */}
      {/* ========================================================================= */}
      <section className="virtual-queue-ops-section" id="virtual-queue-ops-hub">
        {/* Section Header */}
        <div className="ops-header-row">
          <div className="ops-title-group">
            <div className="ops-icon-container">
              <Ticket className="text-emerald" size={22} />
            </div>
            <div>
              <div className="ops-badge-title-row">
                <h3 className="section-title">Virtual Queue Operations Hub</h3>
                <span className="badge-ops-live">SQLITE PERSISTED</span>
              </div>
              <p className="section-sub">
                Live queue telemetry of genuine driver-submitted registrations across Kegalle prototype stations.
              </p>
            </div>
          </div>

          <div className="ops-header-actions">
            {lastQueueRefresh && (
              <span className="ops-synced-time">
                Synced: <strong className="text-cyan mono">{lastQueueRefresh}</strong>
              </span>
            )}
            <button
              type="button"
              className="btn-ops-refresh"
              onClick={fetchQueueRegistrations}
              disabled={isLoadingQueue}
              title="Refresh queue registrations from SQLite database"
            >
              <RefreshCw size={14} className={isLoadingQueue ? 'spin' : ''} />
              <span>{isLoadingQueue ? 'Refreshing...' : 'Refresh Queue'}</span>
            </button>
          </div>
        </div>

        {/* Prototype & Synthetic Simulation Separation Notice */}
        <div className="ops-separation-banner">
          <Info size={16} className="text-cyan flex-shrink-0" />
          <p className="separation-banner-text">
            <strong>System Clarification:</strong> The records below represent driver virtual queue registrations saved in SQLite (<code>virtual_queue_registrations</code>). The simulation controls further down execute synthetic discrete-event models (<code>simulation_summaries</code>) for algorithmic stress-testing.
          </p>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="ops-kpi-grid">
          <div className="ops-kpi-card total">
            <div className="ops-kpi-header">
              <span className="ops-kpi-label">Total Registrations</span>
              <Ticket size={16} className="text-cyan" />
            </div>
            <div className="ops-kpi-val-row">
              <span className="ops-kpi-num cyan">{totalRegistrationsCount}</span>
              <span className="ops-kpi-unit">ALL-TIME</span>
            </div>
            <span className="ops-kpi-sub">Registered driver vehicles</span>
          </div>

          <div className="ops-kpi-card waiting">
            <div className="ops-kpi-header">
              <span className="ops-kpi-label">Waiting in Queue</span>
              <Clock size={16} className="text-amber" />
            </div>
            <div className="ops-kpi-val-row">
              <span className="ops-kpi-num amber">{waitingCount}</span>
              <span className="ops-kpi-unit">ACTIVE</span>
            </div>
            <span className="ops-kpi-sub">Vehicles queued for dispenser</span>
          </div>

          <div className="ops-kpi-card serving">
            <div className="ops-kpi-header">
              <span className="ops-kpi-label">Currently Serving</span>
              <Gauge size={16} className="text-cyan" />
            </div>
            <div className="ops-kpi-val-row">
              <span className="ops-kpi-num cyan">{servingCount}</span>
              <span className="ops-kpi-unit">IN BAY</span>
            </div>
            <span className="ops-kpi-sub">Active fuel dispensing</span>
          </div>

          <div className="ops-kpi-card completed">
            <div className="ops-kpi-header">
              <span className="ops-kpi-label">Completed Service</span>
              <CheckCircle2 size={16} className="text-emerald" />
            </div>
            <div className="ops-kpi-val-row">
              <span className="ops-kpi-num emerald">{completedCount}</span>
              <span className="ops-kpi-unit">CLEARED</span>
            </div>
            <span className="ops-kpi-sub">Successfully fulfilled</span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="ops-filters-toolbar">
          <div className="station-filter-pills">
            <button
              type="button"
              className={`ops-filter-pill ${filterStation === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterStation('ALL')}
            >
              <span>All Stations ({totalRegistrationsCount})</span>
            </button>
            {stations.map(st => {
              const countForStation = queueRegistrations.filter(r => r.station_id === st.id).length;
              return (
                <button
                  key={st.id}
                  type="button"
                  className={`ops-filter-pill ${filterStation === st.id ? 'active' : ''}`}
                  onClick={() => setFilterStation(st.id)}
                >
                  <span>Station {st.id} ({countForStation})</span>
                </button>
              );
            })}
          </div>

          <div className="ops-search-filter-wrap">
            <div className="status-select-wrap">
              <select
                className="ops-status-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="WAITING">Waiting Only</option>
                <option value="SERVING">Serving Only</option>
                <option value="COMPLETED">Completed Only</option>
                <option value="CANCELLED">Cancelled Only</option>
              </select>
            </div>

            <div className="ops-search-input-box">
              <Search size={14} className="text-muted" />
              <input
                type="text"
                placeholder="Filter by plate or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ops-search-input mono"
              />
              {searchQuery && (
                <button type="button" className="btn-clear-search" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
          </div>
        </div>

        {/* Error Banner if fetch failed */}
        {queueError && (
          <div className="ops-error-banner">
            <AlertTriangle size={16} className="text-rose flex-shrink-0" />
            <div className="ops-error-content">
              <strong>Error Connecting to Virtual Queue Database:</strong>
              <span> {queueError}</span>
            </div>
            <button type="button" className="btn-ops-retry" onClick={fetchQueueRegistrations}>
              Retry
            </button>
          </div>
        )}

        {/* Telemetry Data Table */}
        <div className="ops-table-responsive-wrapper">
          <table className="ops-telemetry-table">
            <thead>
              <tr>
                <th>Registration ID</th>
                <th>Vehicle Plate</th>
                <th>Vehicle Type</th>
                <th>Fuel & Litres</th>
                <th>Station</th>
                <th>Queue Position</th>
                <th>Predicted Wait</th>
                <th>Assigned Pump</th>
                <th>Status</th>
                <th>Registered At</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingQueue ? (
                /* Loading State Skeletons */
                <tr>
                  <td colSpan={10} className="table-loading-cell">
                    <div className="ops-loading-spinner-row">
                      <RefreshCw size={18} className="spin text-cyan" />
                      <span>Loading live virtual queue registrations from SQLite database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRegistrations.length === 0 ? (
                /* Empty State */
                <tr>
                  <td colSpan={10} className="table-empty-cell">
                    <div className="ops-empty-state-box">
                      <Inbox size={36} className="text-muted" />
                      <h4 className="empty-title">No Virtual Queue Registrations Found</h4>
                      <p className="empty-desc">
                        {filterStation !== 'ALL' || filterStatus !== 'ALL' || searchQuery
                          ? 'No registrations match your current filter criteria. Try clearing filters.'
                          : 'No drivers have joined the virtual queue yet. Use the Driver Portal to register a vehicle and watch live records appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => {
                  const fuelMeta = FUEL_TYPES.find(f => f.id === reg.fuel_type);
                  const isCopied = copiedRegId === reg.registration_id;

                  return (
                    <tr key={reg.id || reg.registration_id}>
                      {/* Registration ID with Copy */}
                      <td className="cell-reg-id">
                        <div className="reg-id-box mono">
                          <span>{reg.registration_id}</span>
                          <button
                            type="button"
                            className="btn-copy-mini"
                            onClick={() => handleCopyRegId(reg.registration_id)}
                            title="Copy ID"
                          >
                            {isCopied ? <Check size={11} className="text-emerald" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>

                      {/* Vehicle Number */}
                      <td className="cell-vehicle-plate">
                        <div className="vehicle-plate-pill mono">
                          <Car size={13} className="text-cyan" />
                          <span>{reg.vehicle_number}</span>
                        </div>
                      </td>

                      {/* Vehicle Type */}
                      <td>
                        <span className="type-badge-mini">
                          {reg.vehicle_type?.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Fuel & Litres */}
                      <td>
                        <div className="cell-fuel-info">
                          <span className="fuel-tag-sm" style={{ borderColor: fuelMeta?.color || '#06b6d4' }}>
                            <span className="dot" style={{ backgroundColor: fuelMeta?.color || '#06b6d4' }} />
                            {fuelMeta?.short || reg.fuel_type}
                          </span>
                          <span className="fuel-qty mono">{reg.fuel_quantity_litres}L</span>
                        </div>
                      </td>

                      {/* Station */}
                      <td>
                        <span className="station-badge-sm">
                          Station {reg.station_id}
                        </span>
                      </td>

                      {/* Queue Position */}
                      <td>
                        {reg.status === 'WAITING' ? (
                          <span className="ops-position-badge waiting">
                            #{reg.queue_position} in line
                          </span>
                        ) : reg.status === 'SERVING' ? (
                          <span className="ops-position-badge serving">
                            In Bay
                          </span>
                        ) : reg.status === 'COMPLETED' ? (
                          <span className="ops-position-badge completed">
                            Cleared
                          </span>
                        ) : (
                          <span className="ops-position-badge cancelled">
                            Cancelled
                          </span>
                        )}
                      </td>

                      {/* Predicted Wait */}
                      <td>
                        <span className="ops-wait-time text-emerald mono">
                          ~{reg.estimated_wait_min}m
                        </span>
                      </td>

                      {/* Assigned Pump */}
                      <td>
                        <strong className="text-cyan text-sm">
                          {reg.assigned_pump_id ? `Pump ${reg.assigned_pump_id}` : 'Smart Bay'}
                        </strong>
                      </td>

                      {/* Status Badge */}
                      <td>
                        <span className={`ops-status-badge ${reg.status?.toLowerCase() || 'waiting'}`}>
                          <span className="status-dot" />
                          <span>{reg.status}</span>
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="cell-timestamp text-muted text-xs mono">
                        {reg.created_at ? new Date(reg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary & Disclaimer */}
        <div className="ops-table-footer">
          <div className="footer-legend">
            <span className="legend-label">Status Flow:</span>
            <span className="legend-chip waiting"><span className="dot" /> WAITING</span>
            <span className="legend-arrow">➔</span>
            <span className="legend-chip serving"><span className="dot" /> SERVING</span>
            <span className="legend-arrow">➔</span>
            <span className="legend-chip completed"><span className="dot" /> COMPLETED</span>
          </div>

          <div className="footer-disclaimer-pill">
            <ShieldCheck size={13} className="text-muted" />
            <span>Read-Only Management Telemetry • BuildX 0.1 Hackathon Scenario</span>
          </div>
        </div>
      </section>

      {/* Simulation Controls Panel */}
      <section className="simulation-controls-card">
        <div className="sim-panel-header">
          <div className="sim-title-wrap">
            <Cpu size={18} className="text-cyan" />
            <h3 className="sim-panel-title">Simulation Controls (`POST /simulate`)</h3>
          </div>
          <span className="sim-status-label">
            {isSimulating ? 'Simulation in Progress...' : 'Ready to Simulate'}
          </span>
        </div>

        <div className="sim-controls-grid">
          {/* Vehicle Count */}
          <div className="sim-input-group">
            <label className="sim-label">
              <span>Vehicle Count (Default 200 Total):</span>
              <strong className="text-emerald">{vehicleCount}</strong>
            </label>
            <input
              type="range"
              min={50}
              max={500}
              step={10}
              value={vehicleCount}
              onChange={(e) => setVehicleCount(Number(e.target.value))}
              className="sim-slider"
            />
            <div className="sim-range-markers">
              <span>50</span>
              <span>200 (Default)</span>
              <span>500</span>
            </div>
          </div>

          {/* Traffic Scenario */}
          <div className="sim-input-group">
            <label className="sim-label">Traffic Inflow Scenario:</label>
            <div className="scenario-btn-group">
              <button
                type="button"
                className={`scenario-btn ${scenario === 'normal' ? 'active' : ''}`}
                onClick={() => setScenario('normal')}
              >
                <span>Normal Traffic (1.0x)</span>
              </button>
              <button
                type="button"
                className={`scenario-btn ${scenario === 'peak' ? 'active' : ''}`}
                onClick={() => setScenario('peak')}
              >
                <span>Peak Traffic (1.45x)</span>
              </button>
            </div>
          </div>

          {/* Random Seed */}
          <div className="sim-input-group seed-group">
            <label className="sim-label">Simulation Seed:</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="seed-input mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="sim-buttons-group">
            <button
              className="btn-primary-sim"
              onClick={handleStartSimulation}
              disabled={isSimulating}
            >
              <Play size={15} className={isSimulating ? 'spin' : ''} />
              <span>{isSimulating ? 'Simulating...' : 'Start Simulation'}</span>
            </button>
            <button
              className="btn-secondary-sim"
              onClick={handleReset}
              disabled={isSimulating}
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pump Monitoring Cards for Selected Station */}
      <section className="pump-monitoring-section">
        <div className="section-header-row">
          <div className="header-titles">
            <h3 className="section-subheading">
              Pump Monitoring: <span className="text-cyan">{currentStation.name}</span>
            </h3>
            <p className="section-caption">
              Telemetry on 3 dedicated dispensers: Queue length, pump utilisation %, fuel compatibility & live bay status.
            </p>
          </div>
          <div className="station-fuel-tags">
            {FUEL_TYPES.map(fuel => {
              const isAvail = currentStation.fuel_availability?.[fuel.id];
              return (
                <span key={fuel.id} className={`pump-fuel-tag ${isAvail ? 'in' : 'out'}`}>
                  {fuel.short}: {isAvail ? 'In Stock' : 'Depleted'}
                </span>
              );
            })}
          </div>
        </div>

        <div className="pump-cards-grid">
          {currentStation.pumps.map((pump) => {
            const isOffline = pump.status === 'maintenance';
            const isServing = pump.status === 'active' && pump.current_vehicle;

            return (
              <div 
                key={pump.id} 
                className={`pump-card ${isOffline ? 'pump-offline' : ''} ${isServing ? 'pump-active' : ''}`}
              >
                <div className="pump-card-header">
                  <div className="pump-title-box">
                    <span className="pump-id-badge">Pump {pump.id}</span>
                    <h4 className="pump-name">{pump.name}</h4>
                  </div>
                  <span className={`pump-status-badge ${pump.status}`}>
                    {pump.status.toUpperCase()}
                  </span>
                </div>

                {/* Compatible Fuels */}
                <div className="pump-supported-fuels">
                  <span className="support-label">Dispenser Fuels:</span>
                  <div className="fuel-pill-list">
                    {pump.fuel_types.map(ft => {
                      const fuelMeta = FUEL_TYPES.find(f => f.id === ft);
                      return (
                        <span key={ft} className="fuel-tag-mini" style={{ borderColor: fuelMeta?.color || '#06b6d4' }}>
                          <span className="dot" style={{ backgroundColor: fuelMeta?.color || '#06b6d4' }} />
                          {fuelMeta?.short || ft}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Live Vehicle In Bay */}
                <div className="bay-status-block">
                  <span className="bay-label">Vehicle In Bay:</span>
                  {isServing ? (
                    <div className="vehicle-bay-info">
                      <div className="bay-vehicle-row">
                        <Car size={16} className="text-cyan" />
                        <span className="vehicle-reg mono">{pump.current_vehicle.id}</span>
                        <span className="vehicle-type-tag">{pump.current_vehicle.type}</span>
                      </div>
                      <div className="bay-progress-details">
                        <span className="bay-fuel-type">Fuel: {pump.current_vehicle.fuel}</span>
                        <span className="bay-remaining text-emerald">
                          ~{pump.current_vehicle.remaining_sec}s remaining
                        </span>
                      </div>
                    </div>
                  ) : isOffline ? (
                    <div className="vehicle-bay-empty offline">
                      <AlertTriangle size={15} className="text-amber" />
                      <span>Offline for sensor recalibration</span>
                    </div>
                  ) : (
                    <div className="vehicle-bay-empty idle">
                      <CheckCircle size={15} className="text-muted" />
                      <span>Dispenser Idle — Ready for Next Arrival</span>
                    </div>
                  )}
                </div>

                {/* Utilisation & Queue */}
                <div className="pump-metrics-row">
                  <div className="metric-col">
                    <span className="metric-caption">Queue At Pump</span>
                    <span className="metric-value text-amber">{pump.queue_count} veh</span>
                  </div>
                  <div className="metric-col">
                    <span className="metric-caption">Utilisation</span>
                    <span className="metric-value text-cyan">{pump.utilization}%</span>
                  </div>
                  <div className="metric-col">
                    <span className="metric-caption">Flow Rate</span>
                    <span className="metric-value text-emerald">{pump.flow_rate_lpm} L/m</span>
                  </div>
                </div>

                {/* Utilisation Progress Bar */}
                <div className="utilization-bar-container">
                  <div 
                    className="utilization-fill" 
                    style={{ 
                      width: `${pump.utilization}%`,
                      backgroundColor: pump.utilization > 90 ? '#f43f5e' : pump.utilization > 75 ? '#06b6d4' : '#10b981'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* STRATEGY COMPARISON: Fixed FCFS vs Smart Allocation */}
      <section className="strategy-comparison-section">
        <div className="section-header-row">
          <div className="header-titles">
            <div className="title-with-badge">
              <h3 className="section-subheading">Strategy Comparison: Fixed FCFS vs FuelFlow Smart Allocation</h3>
              <span className="badge-comparison-active">Active Evaluation (`POST /compare`)</span>
            </div>
            <p className="section-caption">
              Comparative analysis demonstrating wait time mitigation, throughput gain, and diesel queue isolation.
            </p>
          </div>
        </div>

        {/* Strategy Summary KPI Comparison */}
        <div className="comparison-kpi-grid">
          <div className="comparison-card">
            <span className="comp-title">Average Waiting Time</span>
            <div className="comp-values-row">
              <div className="comp-side fcfs">
                <span className="comp-tag">Fixed FCFS</span>
                <span className="comp-num text-muted">
                  {comparisonData?.overall?.fixed_fcfs?.avg_wait_min} min
                </span>
              </div>
              <div className="comp-arrow">➔</div>
              <div className="comp-side smart">
                <span className="comp-tag highlight">Smart Allocation</span>
                <span className="comp-num text-emerald">
                  {comparisonData?.overall?.smart_allocation?.avg_wait_min} min
                </span>
              </div>
            </div>
            <div className="comp-improvement-badge positive">
              <TrendingDown size={14} />
              <span>{comparisonData?.overall?.improvement?.wait_reduction_pct}% Wait Reduction</span>
            </div>
          </div>

          <div className="comparison-card">
            <span className="comp-title">Maximum Peak Wait Time</span>
            <div className="comp-values-row">
              <div className="comp-side fcfs">
                <span className="comp-tag">Fixed FCFS</span>
                <span className="comp-num text-muted">
                  {comparisonData?.overall?.fixed_fcfs?.max_wait_min} min
                </span>
              </div>
              <div className="comp-arrow">➔</div>
              <div className="comp-side smart">
                <span className="comp-tag highlight">Smart Allocation</span>
                <span className="comp-num text-emerald">
                  {comparisonData?.overall?.smart_allocation?.max_wait_min} min
                </span>
              </div>
            </div>
            <div className="comp-improvement-badge positive">
              <TrendingDown size={14} />
              <span>{comparisonData?.overall?.improvement?.max_wait_reduction_pct}% Peak Reduction</span>
            </div>
          </div>

          <div className="comparison-card">
            <span className="comp-title">Throughput (Vehicles / Hour)</span>
            <div className="comp-values-row">
              <div className="comp-side fcfs">
                <span className="comp-tag">Fixed FCFS</span>
                <span className="comp-num text-muted">
                  {comparisonData?.overall?.fixed_fcfs?.throughput_per_hr} veh/h
                </span>
              </div>
              <div className="comp-arrow">➔</div>
              <div className="comp-side smart">
                <span className="comp-tag highlight">Smart Allocation</span>
                <span className="comp-num text-cyan">
                  {comparisonData?.overall?.smart_allocation?.throughput_per_hr} veh/h
                </span>
              </div>
            </div>
            <div className="comp-improvement-badge positive">
              <TrendingUp size={14} />
              <span>+{comparisonData?.overall?.improvement?.throughput_gain_pct}% Throughput Gain</span>
            </div>
          </div>
        </div>

        {/* Recharts Comparison Visualizations */}
        <div className="charts-layout-grid">
          {/* Chart 1: Waiting Time Timeline */}
          <div className="chart-card">
            <div className="chart-header">
              <h4 className="chart-title">Waiting Time Over Time (60-min Horizon)</h4>
              <span className="chart-subtitle">FCFS Congestion Curve vs Smart Pump Leveling</span>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={comparisonData.timeline_chart} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fcfsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="smartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} unit="m" />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Area 
                    type="monotone" 
                    dataKey="fcfs_wait" 
                    name="Fixed FCFS Wait (min)" 
                    stroke="#f43f5e" 
                    fill="url(#fcfsGrad)" 
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="smart_wait" 
                    name="Smart Allocation Wait (min)" 
                    stroke="#10b981" 
                    fill="url(#smartGrad)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Station Breakdown BarChart */}
          <div className="chart-card">
            <div className="chart-header">
              <h4 className="chart-title">Waiting Time By Station: FCFS vs Smart</h4>
              <span className="chart-subtitle">Comparative reduction across Stations A, B & C</span>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comparisonData.station_breakdown} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} unit="m" />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="fixed_avg_wait" name="FCFS Avg Wait" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="smart_avg_wait" name="Smart Avg Wait" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="smart_max_wait" name="Smart Max Peak" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* SMART ALLOCATION LIVE ASSIGNMENT STREAM */}
      <section className="smart-allocation-log-section">
        <div className="section-header-row">
          <div className="header-titles">
            <div className="title-with-badge">
              <h3 className="section-subheading">Smart Pump Assignment Stream</h3>
              <span className="badge-ai-live">AI Allocator Active</span>
            </div>
            <p className="section-caption">
              Live automated decisions allocating arriving vehicles to optimal pumps based on fuel compatibility, queue length, and vehicle service rate.
            </p>
          </div>
        </div>

        <div className="table-responsive-wrapper">
          <table className="allocation-stream-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Vehicle & Reg</th>
                <th>Fuel Required</th>
                <th>Assigned Station</th>
                <th>Assigned Pump</th>
                <th>AI Decision Rationale</th>
                <th>Est. Time Saved</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {allocationLog.map((log) => (
                <tr key={log.id}>
                  <td className="mono text-cyan">{log.id}</td>
                  <td>
                    <div className="cell-vehicle-info">
                      <span className="reg-id mono">{log.vehicle_id}</span>
                      <span className="type-badge">{log.vehicle_type}</span>
                    </div>
                  </td>
                  <td>
                    <span className="fuel-pill-table">
                      {log.fuel.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="station-badge">Station {log.assigned_station}</span>
                  </td>
                  <td>
                    <strong className="text-emerald">{log.assigned_pump}</strong>
                  </td>
                  <td className="rationale-cell">
                    <span className="rationale-text">{log.reason}</span>
                  </td>
                  <td>
                    <span className="time-saved-pill">
                      <TrendingDown size={12} />
                      -{log.saved_wait_min}m
                    </span>
                  </td>
                  <td className="text-muted text-sm">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
