import { useState, useEffect } from 'react';
import { 
  Navigation, 
  Clock, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Car, 
  Zap, 
  ShieldCheck, 
  Sliders, 
  Info,
  Ticket,
  Copy,
  Check,
  RefreshCw,
  Search,
  AlertTriangle,
  ArrowRight,
  Fuel
} from 'lucide-react';
import { 
  PROTOTYPE_LOCATIONS, 
  FUEL_TYPES, 
  VEHICLE_TYPES, 
  computeRecommendation 
} from '../data/demoData';
import { 
  getRecommendation, 
  predictWaitTime, 
  joinVirtualQueue, 
  getQueueStatus 
} from '../services/api';

const DEMO_PRESETS = [
  { label: 'City Commuter', plate: 'WP-CAB-4012', vehicle: 'car', fuel: 'petrol_92', qty: 30, station: 'A' },
  { label: 'Delivery Van', plate: 'CP-ND-5510', vehicle: 'van', fuel: 'diesel', qty: 45, station: 'A' },
  { label: 'Express TukTuk', plate: 'WP-AA-9182', vehicle: 'three_wheeler', fuel: 'petrol_92', qty: 12, station: 'B' },
  { label: 'Highway Freight', plate: 'EP-LA-3091', vehicle: 'lorry', fuel: 'diesel', qty: 80, station: 'B' }
];

export default function DriverPortal({ stations }) {
  // Driver filters
  const [selectedLocationId, setSelectedLocationId] = useState('kegalle_clock_tower');
  const [selectedFuel, setSelectedFuel] = useState('petrol_92');
  const [selectedVehicle, setSelectedVehicle] = useState('car');
  
  // Recommendation state
  const [recommendation, setRecommendation] = useState(null);
  const [isLoadingRec, setIsLoadingRec] = useState(false);
  const [recSource, setRecSource] = useState('demo');

  // Interactive Live Predictor Tool
  const [showPredictor, setShowPredictor] = useState(false);
  const [customStationId, setCustomStationId] = useState('A');
  const [predictionResult, setPredictionResult] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Virtual Queue Registration & Active Ticket State
  const [activeTicket, setActiveTicket] = useState(() => {
    try {
      const saved = sessionStorage.getItem('fuelflow_active_ticket');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [regPlate, setRegPlate] = useState('');
  const [regVehicleType, setRegVehicleType] = useState('car');
  const [regFuelType, setRegFuelType] = useState('petrol_92');
  const [regQuantity, setRegQuantity] = useState(30);
  const [regStationId, setRegStationId] = useState('A');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [regError, setRegError] = useState(null);
  const [regValidationErrors, setRegValidationErrors] = useState({});
  const [copiedTicketId, setCopiedTicketId] = useState(false);
  const [isRefreshingTicket, setIsRefreshingTicket] = useState(false);
  const [ticketRefreshNotice, setTicketRefreshNotice] = useState(null);
  const [showLookupDrawer, setShowLookupDrawer] = useState(false);
  const [lookupInput, setLookupInput] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  // Selected location object
  const currentLocation = PROTOTYPE_LOCATIONS.find(l => l.id === selectedLocationId) || PROTOTYPE_LOCATIONS[0];
  const currentFuelObj = FUEL_TYPES.find(f => f.id === selectedFuel) || FUEL_TYPES[0];
  const currentVehicleObj = VEHICLE_TYPES.find(v => v.id === selectedVehicle) || VEHICLE_TYPES[0];

  // Re-run recommendation whenever location or fuel type changes
  useEffect(() => {
    let isMounted = true;
    async function fetchRec() {
      setIsLoadingRec(true);
      try {
        const res = await getRecommendation({
          location: currentLocation.name,
          fuel_type: selectedFuel,
          location_id: selectedLocationId
        });
        if (isMounted) {
          setRecommendation(res.recommendation);
          setRecSource(res.isDemo ? 'demo' : 'api');
        }
      } catch {
        if (isMounted) {
          const fallback = computeRecommendation(stations, selectedLocationId, selectedFuel);
          setRecommendation({
            location: currentLocation.name,
            fuel_type: selectedFuel,
            recommended_station: fallback.recommended_station,
            all_stations: fallback.all_stations,
            rationale: `${fallback.recommended_station.name} provides the minimum combined travel and queue waiting time.`
          });
          setRecSource('demo');
        }
      } finally {
        if (isMounted) setIsLoadingRec(false);
      }
    }

    fetchRec();
    return () => { isMounted = false; };
  }, [selectedLocationId, selectedFuel, stations, currentLocation.name]);

  // Handle on-demand quick ML wait prediction
  const handleRunPredict = async () => {
    setIsPredicting(true);
    const targetStation = stations.find(s => s.id === customStationId) || stations[0];
    const compatiblePumps = targetStation.pumps.filter(p => p.fuel_types.includes(selectedFuel)).length || 1;

    try {
      const res = await predictWaitTime({
        station_id: customStationId,
        fuel_type: selectedFuel,
        vehicle_type: selectedVehicle,
        queue_length: targetStation.queue_length,
        active_compatible_pumps: compatiblePumps,
        estimated_service_min: Math.round(currentVehicleObj.avg_service_min),
        workload_min: Math.round(targetStation.queue_length * currentVehicleObj.avg_service_min)
      });
      setPredictionResult(res);
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setIsPredicting(false);
    }
  };

// Synchronize registration fuel type after the selected fuel changes
useEffect(() => {
  const timer = setTimeout(() => {
    if (selectedFuel) {
      setRegFuelType(selectedFuel);
    }
  }, 0);

  return () => clearTimeout(timer);
}, [selectedFuel]);

useEffect(() => {
  const timer = setTimeout(() => {
    if (selectedVehicle) {
      setRegVehicleType(selectedVehicle);
    }
  }, 0);

  return () => clearTimeout(timer);
}, [selectedVehicle]);

useEffect(() => {
  const timer = setTimeout(() => {
    if (recommendation?.recommended_station?.id) {
      setRegStationId(recommendation.recommended_station.id);
    }
  }, 0);

  return () => clearTimeout(timer);
}, [recommendation?.recommended_station?.id]);

  const targetRegStation = stations.find(s => s.id === regStationId) || stations[0];
  const targetFuelInStock = targetRegStation?.fuel_availability?.[regFuelType] ?? true;
  const targetHasCompatiblePump = targetRegStation?.pumps?.some(
    p => p.status !== 'maintenance' && p.fuel_types.includes(regFuelType)
  ) ?? true;
  const selectedStationIncompatible = !targetFuelInStock || !targetHasCompatiblePump;
  const incompatibilityReason = !targetFuelInStock
    ? `${regFuelType.replace('_', ' ').toUpperCase()} is out of stock at ${targetRegStation?.name || 'this station'}. Select another station.`
    : !targetHasCompatiblePump
    ? `No operational dispensers currently support ${regFuelType.replace('_', ' ').toUpperCase()} at ${targetRegStation?.name || 'this station'}.`
    : null;

  const handleApplyPreset = (preset) => {
    setRegPlate(preset.plate);
    setRegVehicleType(preset.vehicle);
    setRegFuelType(preset.fuel);
    setRegQuantity(preset.qty);
    setRegStationId(preset.station);
    setRegValidationErrors({});
    setRegError(null);
  };

  const handleJoinQueue = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setRegError(null);

    const errors = {};
    const cleanPlate = (regPlate || '').trim().toUpperCase();

    if (!cleanPlate) {
      errors.plate = 'Vehicle registration plate number is required (e.g. WP-CAB-4012).';
    } else if (!/^[A-Z0-9\-\s]{3,20}$/.test(cleanPlate)) {
      errors.plate = 'Registration must only contain letters, numbers, and hyphens.';
    } else if (!(/[A-Z]/.test(cleanPlate) && /[0-9]/.test(cleanPlate))) {
      errors.plate = 'Registration must contain both letters and digits (e.g. WP-CAB-4012).';
    }

    const numQty = Number(regQuantity);
    if (!numQty || numQty <= 0) {
      errors.quantity = 'Please enter a valid fuel quantity in litres (e.g. 20 L).';
    } else if (numQty > 150) {
      errors.quantity = 'Maximum allowed quantity per request is 150 Litres.';
    }

    if (selectedStationIncompatible) {
      errors.station = incompatibilityReason;
    }

    setRegValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmittingReg(true);
    try {
      const res = await joinVirtualQueue({
        vehicle_number: cleanPlate,
        vehicle_type: regVehicleType,
        fuel_type: regFuelType,
        fuel_quantity_litres: numQty,
        station_id: regStationId
      });

      if (res.success && res.ticket) {
        setActiveTicket(res.ticket);
        sessionStorage.setItem('fuelflow_active_ticket', JSON.stringify(res.ticket));
        setRegError(null);
        setRegValidationErrors({});
      } else {
        setRegError(res.error || 'Failed to register virtual queue ticket.');
      }
    } catch (err) {
      setRegError(err.message || 'Error communicating with backend.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const handleRefreshTicket = async () => {
    if (!activeTicket?.registration_id) return;
    setIsRefreshingTicket(true);
    setTicketRefreshNotice(null);

    try {
      const res = await getQueueStatus(activeTicket.registration_id);
      if (res.success && res.ticket) {
        setActiveTicket(res.ticket);
        sessionStorage.setItem('fuelflow_active_ticket', JSON.stringify(res.ticket));
        setTicketRefreshNotice('Ticket status and queue position synced with live server.');
        setTimeout(() => setTicketRefreshNotice(null), 4000);
      } else {
        setTicketRefreshNotice(res.error || 'Unable to refresh ticket status.');
      }
    } catch {
      setTicketRefreshNotice('Network connection error while refreshing status.');
    } finally {
      setIsRefreshingTicket(false);
    }
  };

  const handleDismissTicket = () => {
    sessionStorage.removeItem('fuelflow_active_ticket');
    setActiveTicket(null);
    setTicketRefreshNotice(null);
  };

  const handleCopyTicketId = () => {
    if (!activeTicket?.registration_id) return;
    navigator.clipboard?.writeText(activeTicket.registration_id);
    setCopiedTicketId(true);
    setTimeout(() => setCopiedTicketId(false), 2000);
  };

  const handleLookupTicket = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!lookupInput.trim()) return;
    setIsLookingUp(true);
    setLookupError(null);

    try {
      const res = await getQueueStatus(lookupInput);
      if (res.success && res.ticket) {
        setActiveTicket(res.ticket);
        sessionStorage.setItem('fuelflow_active_ticket', JSON.stringify(res.ticket));
        setShowLookupDrawer(false);
        setLookupInput('');
      } else {
        setLookupError(res.error || 'No active virtual queue ticket found for this identifier.');
      }
    } catch (err) {
      setLookupError(err.message || 'Error communicating with backend.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const bestStationId = recommendation?.recommended_station?.id || 'A';
  const displayStations = recommendation?.all_stations || stations;

  return (
    <div className="portal-container driver-portal">
      {/* Top Controls: Location & Fuel Selector */}
      <section className="selection-panel">
        <div className="panel-header">
          <div className="panel-title-group">
            <Navigation className="section-icon emerald" size={20} />
            <div>
              <h2 className="section-title">Driver Station Finder & Journey Planner</h2>
              <p className="section-sub">
                Select your prototype departure location and required fuel type to calculate optimal queue predictions.
              </p>
            </div>
          </div>
          <div className="prototype-tag">
            <MapPin size={13} />
            <span>Fictional Kegalle Prototype</span>
          </div>
        </div>

        <div className="selection-grid">
          {/* 1. Location Selector */}
          <div className="control-card">
            <label className="control-label" htmlFor="location-select">
              <MapPin size={15} className="control-icon cyan" />
              <span>1. Departure Location</span>
            </label>
            <select
              id="location-select"
              className="custom-select"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
            >
              {PROTOTYPE_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.area})
                </option>
              ))}
            </select>
            <span className="control-hint">
              Selected origin: <strong className="text-cyan">{currentLocation.area}</strong>
            </span>
          </div>

          {/* 2. Fuel Type Selector */}
          <div className="control-card">
            <label className="control-label">
              <Zap size={15} className="control-icon emerald" />
              <span>2. Required Fuel Type</span>
            </label>
            <div className="fuel-pill-group">
              {FUEL_TYPES.map((fuel) => {
                const isSelected = selectedFuel === fuel.id;
                return (
                  <button
                    key={fuel.id}
                    type="button"
                    className={`fuel-select-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedFuel(fuel.id)}
                    style={{
                      borderColor: isSelected ? fuel.color : 'transparent',
                      '--fuel-glow': fuel.color
                    }}
                  >
                    <span className="fuel-color-dot" style={{ backgroundColor: fuel.color }} />
                    <span className="fuel-pill-title">{fuel.short}</span>
                  </button>
                );
              })}
            </div>
            <span className="control-hint">
              Active filter: <strong className="text-emerald">{currentFuelObj.label}</strong>
            </span>
          </div>

          {/* 3. Vehicle Type Selector */}
          <div className="control-card">
            <label className="control-label">
              <Car size={15} className="control-icon amber" />
              <span>3. Vehicle Type (Service Calibration)</span>
            </label>
            <div className="vehicle-pill-group">
              {VEHICLE_TYPES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`vehicle-select-pill ${selectedVehicle === v.id ? 'active' : ''}`}
                  onClick={() => setSelectedVehicle(v.id)}
                  title={`Avg service time: ~${v.avg_service_min} min`}
                >
                  <span>{v.label.split('/')[0]}</span>
                </button>
              ))}
            </div>
            <span className="control-hint">
              Est. pump service time: <strong className="text-amber">~{currentVehicleObj.avg_service_min} min</strong>
            </span>
          </div>
        </div>
      </section>

      {/* AI Recommendation Highlight Card */}
      {recommendation?.recommended_station && (
        <section className={`recommendation-hero-card ${isLoadingRec ? 'refreshing' : ''}`}>
          <div className="rec-glow-accent" />
          <div className="rec-badge-row">
            <div className="rec-sparkle-pill">
              <Sparkles size={15} className="sparkle-icon" />
              <span>AI RECOMMENDED BEST STATION</span>
            </div>
            <div className="rec-meta-tag">
              <ShieldCheck size={14} />
              <span>Multi-Objective Optimized (Mode: {recSource.toUpperCase()})</span>
            </div>
          </div>

          <div className="rec-content-grid">
            <div className="rec-main-info">
              <h3 className="rec-station-name">{recommendation.recommended_station.name}</h3>
              <p className="rec-location-text">
                <MapPin size={14} className="pin-icon" />
                {recommendation.recommended_station.location_label || 'Kegalle Corridor'}
              </p>
              <div className="rec-rationale-box">
                <Info size={16} className="info-icon" />
                <p className="rec-rationale-text">
                  {recommendation.rationale || 
                    `Fastest turnaround overall (${recommendation.recommended_station.total_time_min} mins total). Confirmed ${currentFuelObj.label} availability with low dispenser congestion.`}
                </p>
              </div>
            </div>

            {/* Turnaround Time Breakdown */}
            <div className="rec-metrics-cluster">
              <div className="rec-metric-card primary">
                <span className="metric-label">Total Journey + Wait</span>
                <div className="metric-value-row">
                  <span className="metric-large emerald">
                    {recommendation.recommended_station.total_time_min}
                  </span>
                  <span className="metric-unit">min</span>
                </div>
                <span className="metric-subtext">Estimated door-to-pump departure</span>
              </div>

              <div className="rec-split-metrics">
                <div className="mini-metric">
                  <div className="mini-label">
                    <Navigation size={13} className="text-cyan" />
                    <span>Travel Time</span>
                  </div>
                  <span className="mini-val text-cyan">
                    {recommendation.recommended_station.travel_time_min} min
                  </span>
                  <span className="mini-detail">({recommendation.recommended_station.distance_km} km)</span>
                </div>

                <div className="mini-metric">
                  <div className="mini-label">
                    <Clock size={13} className="text-emerald" />
                    <span>Queue Wait</span>
                  </div>
                  <span className="mini-val text-emerald">
                    {recommendation.recommended_station.predicted_wait_min} min
                  </span>
                  <span className="mini-detail">({recommendation.recommended_station.queue_length} vehicles ahead)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rec-footer-bar">
            <div className="fuel-avail-indicator">
              <span className="avail-label">Fuel Status:</span>
              <div className="avail-badges">
                {FUEL_TYPES.map(fuel => {
                  const isAvailable = recommendation.recommended_station.fuel_availability?.[fuel.id];
                  return (
                    <span 
                      key={fuel.id} 
                      className={`avail-pill ${isAvailable ? 'in-stock' : 'out-of-stock'} ${selectedFuel === fuel.id ? 'highlight-requested' : ''}`}
                    >
                      {isAvailable ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {fuel.short}: {isAvailable ? 'Available' : 'Depleted'}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="rec-action-buttons">
              <button 
                className="action-btn-secondary"
                onClick={() => {
                  setCustomStationId(recommendation.recommended_station.id);
                  setShowPredictor(true);
                }}
              >
                <Sliders size={14} />
                <span>Custom Predictor</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* VIRTUAL QUEUE SECTION (v1.1 Portfolio Edition)                            */}
      {/* ========================================================================= */}
      <section className="virtual-queue-wrapper" id="virtual-queue-section">
        {activeTicket ? (
          /* Digital Queue Pass / Ticket View */
          <div className="virtual-ticket-card">
            <div className="ticket-card-glow" />
            
            <div className="ticket-pass-header">
              <div className="ticket-badge-group">
                <div className="pass-type-badge">
                  <Ticket size={14} className="text-emerald" />
                  <span>VIRTUAL QUEUE PASS</span>
                </div>
                <div className={`pass-status-pill ${activeTicket.status?.toLowerCase() || 'waiting'}`}>
                  <span className="live-pulse-dot" />
                  <span>{activeTicket.status || 'WAITING'}</span>
                </div>
              </div>

              <div className="ticket-id-copy-group">
                <span className="ticket-id-label">Registration ID:</span>
                <span className="ticket-id-code mono">{activeTicket.registration_id}</span>
                <button 
                  type="button" 
                  className="btn-copy-ticket"
                  onClick={handleCopyTicketId}
                  title="Copy Registration ID"
                >
                  {copiedTicketId ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                  <span>{copiedTicketId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Ticket Hero Metrics */}
            <div className="ticket-hero-metrics-grid">
              <div className="ticket-hero-metric primary">
                <span className="hero-metric-caption">Queue Position</span>
                <div className="hero-metric-val-row">
                  <span className="hero-metric-number emerald">
                    {activeTicket.queue_position > 0 ? `#${activeTicket.queue_position}` : 'In Service'}
                  </span>
                </div>
                <span className="hero-metric-sub">
                  {activeTicket.queue_position > 1 
                    ? `${activeTicket.queue_position - 1} vehicle(s) ahead in line`
                    : activeTicket.queue_position === 1
                    ? 'Next in line for dispenser'
                    : 'Currently in fueling bay'}
                </span>
              </div>

              <div className="ticket-hero-metric cyan">
                <span className="hero-metric-caption">Est. Waiting Time</span>
                <div className="hero-metric-val-row">
                  <span className="hero-metric-number cyan">
                    {activeTicket.estimated_wait_min}
                  </span>
                  <span className="hero-metric-unit">min</span>
                </div>
                <span className="hero-metric-sub">ML Forecast (RandomForestRegressor)</span>
              </div>

              <div className="ticket-hero-metric amber">
                <span className="hero-metric-caption">Assigned Dispenser</span>
                <div className="hero-metric-val-row">
                  <span className="hero-metric-number amber">
                    {activeTicket.assigned_pump_name || (activeTicket.assigned_pump_id ? `Pump ${activeTicket.assigned_pump_id}` : 'Smart Bay')}
                  </span>
                </div>
                <span className="hero-metric-sub">
                  {activeTicket.station_name || `Station ${activeTicket.station_id}`}
                </span>
              </div>
            </div>

            {/* Perforated Divider */}
            <div className="ticket-perforated-divider">
              <span className="notch-cut left" />
              <span className="dashed-line" />
              <span className="notch-cut right" />
            </div>

            {/* Ticket Details Matrix */}
            <div className="ticket-details-matrix">
              <div className="ticket-detail-item">
                <span className="detail-label">
                  <Car size={13} className="text-cyan" />
                  <span>Vehicle Number & Type</span>
                </span>
                <strong className="detail-val mono">
                  {activeTicket.vehicle_number}
                  <span className="detail-sub-tag">{activeTicket.vehicle_type?.replace('_', ' ').toUpperCase()}</span>
                </strong>
              </div>

              <div className="ticket-detail-item">
                <span className="detail-label">
                  <Fuel size={13} className="text-emerald" />
                  <span>Fuel Requested</span>
                </span>
                <strong className="detail-val">
                  {activeTicket.fuel_quantity_litres} Litres • {activeTicket.fuel_type?.replace('_', ' ').toUpperCase()}
                </strong>
              </div>

              <div className="ticket-detail-item">
                <span className="detail-label">
                  <MapPin size={13} className="text-amber" />
                  <span>Selected Station</span>
                </span>
                <strong className="detail-val">
                  {activeTicket.station_name || `Station ${activeTicket.station_id}`}
                </strong>
              </div>

              <div className="ticket-detail-item">
                <span className="detail-label">
                  <Clock size={13} className="text-slate" />
                  <span>Registered At</span>
                </span>
                <strong className="detail-val">
                  {activeTicket.created_at ? new Date(activeTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                </strong>
              </div>
            </div>

            {ticketRefreshNotice && (
              <div className="ticket-notice-banner">
                <Info size={14} className="text-cyan" />
                <span>{ticketRefreshNotice}</span>
              </div>
            )}

            {/* Mandatory Prototype Disclaimer */}
            <div className="ticket-disclaimer-card">
              <AlertTriangle size={15} className="text-amber" />
              <p className="ticket-disclaimer-text">
                <strong>Simulation Prototype</strong> — This is a virtual queue and does not reserve a place at a real fuel station.
              </p>
            </div>

            {/* Ticket Actions */}
            <div className="ticket-actions-row">
              <button
                type="button"
                className="btn-ticket-refresh"
                onClick={handleRefreshTicket}
                disabled={isRefreshingTicket}
              >
                <RefreshCw size={14} className={isRefreshingTicket ? 'spin' : ''} />
                <span>{isRefreshingTicket ? 'Refreshing Live Status...' : 'Refresh Live Status'}</span>
              </button>

              <button
                type="button"
                className="btn-ticket-dismiss"
                onClick={handleDismissTicket}
              >
                <span>Register Another Vehicle</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ) : (
          /* Driver Registration Form View */
          <div className="queue-registration-card">
            <div className="reg-card-header">
              <div className="reg-title-wrap">
                <div className="reg-icon-box">
                  <Ticket className="text-emerald" size={20} />
                </div>
                <div>
                  <div className="reg-title-badge-row">
                    <h3 className="reg-heading">Driver Virtual Queue Registration</h3>
                    <span className="badge-reg-v11">v1.1 VIRTUAL</span>
                  </div>
                  <p className="reg-subtext">
                    Join the virtual queue at your preferred station. Receive real-time position updates and ML wait predictions.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn-toggle-lookup"
                onClick={() => setShowLookupDrawer(!showLookupDrawer)}
              >
                <Search size={13} />
                <span>{showLookupDrawer ? 'Hide Ticket Lookup' : 'Check Existing Ticket'}</span>
              </button>
            </div>

            {/* Collapsible Lookup Form */}
            {showLookupDrawer && (
              <div className="lookup-drawer-panel">
                <div className="lookup-drawer-title">
                  <Search size={14} className="text-cyan" />
                  <span>Retrieve Your Active Ticket by Vehicle Plate or Ticket ID</span>
                </div>
                <form onSubmit={handleLookupTicket} className="lookup-form-inline">
                  <input
                    type="text"
                    className="lookup-input mono"
                    placeholder="e.g. WP-CAB-4012 or VQ-20261119-A1B2C3"
                    value={lookupInput}
                    onChange={(e) => setLookupInput(e.target.value.toUpperCase())}
                  />
                  <button type="submit" className="btn-lookup-action" disabled={isLookingUp || !lookupInput.trim()}>
                    {isLookingUp ? <RefreshCw size={13} className="spin" /> : <Search size={13} />}
                    <span>{isLookingUp ? 'Searching...' : 'Find Ticket'}</span>
                  </button>
                </form>
                {lookupError && <p className="lookup-error-msg">{lookupError}</p>}
              </div>
            )}

            {/* Quick Demo Presets */}
            <div className="demo-presets-bar">
              <span className="presets-caption">
                <Sparkles size={12} className="text-cyan" />
                <span>Demo Quick-Fill:</span>
              </span>
              <div className="presets-btn-row">
                {DEMO_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="preset-chip-btn"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <span className="chip-label">{preset.label}</span>
                    <span className="chip-plate mono">{preset.plate}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleJoinQueue} className="queue-form-body" noValidate>
              <div className="form-fields-grid">
                {/* 1. Vehicle Registration Plate */}
                <div className="form-field-group">
                  <label className="form-field-label" htmlFor="reg-plate-input">
                    <Car size={14} className="text-cyan" />
                    <span>1. Vehicle Registration Number</span>
                    <span className="field-required">*</span>
                  </label>
                  <div className={`plate-input-container ${regValidationErrors.plate ? 'input-error' : ''}`}>
                    <span className="plate-country-tag">🇱🇰 LK</span>
                    <input
                      id="reg-plate-input"
                      type="text"
                      className="plate-input-control mono"
                      placeholder="WP-CAB-4012"
                      value={regPlate}
                      onChange={(e) => {
                        setRegPlate(e.target.value.toUpperCase());
                        if (regValidationErrors.plate) {
                          setRegValidationErrors(prev => ({ ...prev, plate: null }));
                        }
                      }}
                      maxLength={18}
                    />
                  </div>
                  {regValidationErrors.plate ? (
                    <span className="form-inline-error">{regValidationErrors.plate}</span>
                  ) : (
                    <span className="form-inline-hint">Alphanumeric plate (e.g. <code>WP-CAB-4012</code> or <code>CAD-8812</code>)</span>
                  )}
                </div>

                {/* 2. Vehicle Type */}
                <div className="form-field-group">
                  <label className="form-field-label">
                    <Car size={14} className="text-amber" />
                    <span>2. Vehicle Type</span>
                  </label>
                  <div className="form-pills-row">
                    {VEHICLE_TYPES.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        className={`form-select-pill ${regVehicleType === v.id ? 'active' : ''}`}
                        onClick={() => setRegVehicleType(v.id)}
                      >
                        <span className="pill-title">{v.label.split('/')[0]}</span>
                        <span className="pill-sub">~{v.avg_service_min}m</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Fuel Type */}
                <div className="form-field-group">
                  <label className="form-field-label">
                    <Zap size={14} className="text-emerald" />
                    <span>3. Required Fuel Type</span>
                  </label>
                  <div className="form-pills-row">
                    {FUEL_TYPES.map(f => {
                      const isSelected = regFuelType === f.id;
                      const targetSt = stations.find(s => s.id === regStationId);
                      const inStock = targetSt ? targetSt.fuel_availability?.[f.id] : true;

                      return (
                        <button
                          key={f.id}
                          type="button"
                          className={`form-select-pill fuel-pill ${isSelected ? 'active' : ''} ${!inStock ? 'is-depleted' : ''}`}
                          onClick={() => setRegFuelType(f.id)}
                        >
                          <span className="fuel-dot" style={{ backgroundColor: f.color }} />
                          <span className="pill-title">{f.label}</span>
                          <span className={`pill-stock-tag ${inStock ? 'in' : 'out'}`}>
                            {inStock ? 'In Stock' : 'Depleted'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Fuel Quantity in Litres */}
                <div className="form-field-group">
                  <label className="form-field-label" htmlFor="reg-qty-input">
                    <Fuel size={14} className="text-cyan" />
                    <span>4. Required Fuel Quantity (Litres)</span>
                    <span className="field-required">*</span>
                  </label>
                  <div className="qty-input-controls">
                    <div className="qty-stepper-box">
                      <input
                        id="reg-qty-input"
                        type="number"
                        min={1}
                        max={150}
                        step={1}
                        className="qty-number-control mono"
                        value={regQuantity}
                        onChange={(e) => {
                          setRegQuantity(e.target.value);
                          if (regValidationErrors.quantity) {
                            setRegValidationErrors(prev => ({ ...prev, quantity: null }));
                          }
                        }}
                      />
                      <span className="qty-unit-tag">Litres</span>
                    </div>

                    <div className="qty-preset-chips">
                      {[10, 20, 35, 50, 75].map(litres => (
                        <button
                          key={litres}
                          type="button"
                          className={`qty-preset-btn ${Number(regQuantity) === litres ? 'active' : ''}`}
                          onClick={() => setRegQuantity(litres)}
                        >
                          {litres}L
                        </button>
                      ))}
                    </div>
                  </div>
                  {regValidationErrors.quantity && (
                    <span className="form-inline-error">{regValidationErrors.quantity}</span>
                  )}
                </div>

                {/* 5. Preferred Station */}
                <div className="form-field-group full-width">
                  <label className="form-field-label">
                    <MapPin size={14} className="text-emerald" />
                    <span>5. Preferred Fuel Station</span>
                  </label>
                  <div className="station-select-cards-row">
                    {stations.map(st => {
                      const isSelected = regStationId === st.id;
                      const isAiBest = st.id === bestStationId;
                      const fuelInStock = st.fuel_availability?.[regFuelType];
                      const hasPump = st.pumps?.some(p => p.status !== 'maintenance' && p.fuel_types.includes(regFuelType));
                      const isCompatible = fuelInStock && hasPump;

                      return (
                        <div
                          key={st.id}
                          className={`station-choice-card ${isSelected ? 'is-selected' : ''} ${!isCompatible ? 'is-incompatible' : ''}`}
                          onClick={() => setRegStationId(st.id)}
                        >
                          <div className="choice-header">
                            <span className="choice-code">Station {st.id}</span>
                            {isAiBest && (
                              <span className="choice-ai-badge">
                                <Sparkles size={10} /> AI Best
                              </span>
                            )}
                          </div>
                          <span className="choice-name">{st.name.split('-')[1]?.trim() || st.name}</span>
                          <div className="choice-stats">
                            <span>Queue: <strong>{st.queue_length} veh</strong></span>
                            <span>Wait: <strong>~{st.predicted_wait_min}m</strong></span>
                          </div>
                          <div className="choice-status">
                            {isCompatible ? (
                              <span className="text-emerald">✓ Available for {regFuelType.replace('_', ' ').toUpperCase()}</span>
                            ) : (
                              <span className="text-rose">✕ Fuel Unavailable</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Incompatibility Alert Banner */}
              {selectedStationIncompatible && (
                <div className="reg-warning-callout">
                  <AlertTriangle size={15} className="text-amber" />
                  <div className="callout-content">
                    <strong>Dispenser / Fuel Warning:</strong>
                    <span> {incompatibilityReason}</span>
                  </div>
                </div>
              )}

              {/* Submission Error Banner */}
              {regError && (
                <div className="reg-error-callout">
                  <XCircle size={15} className="text-rose" />
                  <div className="callout-content">
                    <strong>Registration Blocked:</strong>
                    <span> {regError}</span>
                  </div>
                </div>
              )}

              {/* Form Action Footer */}
              <div className="reg-action-footer">
                <div className="reg-footer-note">
                  <ShieldCheck size={14} className="text-muted" />
                  <span>Virtual queue prototype. Enforces active duplicate vehicle checks.</span>
                </div>

                <button
                  type="submit"
                  className="btn-submit-queue"
                  disabled={isSubmittingReg || selectedStationIncompatible}
                >
                  {isSubmittingReg ? (
                    <>
                      <RefreshCw size={15} className="spin" />
                      <span>Reserving Queue Position...</span>
                    </>
                  ) : (
                    <>
                      <Ticket size={16} />
                      <span>Join Virtual Queue</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Station Cards Grid (Station A, Station B, Station C) */}
      <section className="stations-section">
        <div className="section-header-row">
          <div className="header-titles">
            <h3 className="section-subheading">Nearby Prototype Fuel Stations</h3>
            <p className="section-caption">
              Live queue telemetry and journey estimates from <strong>{currentLocation.name}</strong>.
            </p>
          </div>
          <span className="station-count-pill">
            3 Stations Monitored
          </span>
        </div>

        <div className="station-cards-grid">
          {displayStations.map((station) => {
            const isBest = station.id === bestStationId;
            const hasRequestedFuel = station.fuel_availability?.[selectedFuel];
            const travelTime = station.travel_time_min;
            const waitTime = station.predicted_wait_min;
            const totalTime = station.total_time_min || (travelTime + waitTime);
            const activePumpsCount = station.pumps?.filter(p => p.status === 'active').length ?? 3;

            return (
              <div 
                key={station.id} 
                className={`station-card ${isBest ? 'is-recommended' : ''} ${!hasRequestedFuel ? 'fuel-unavailable' : ''}`}
              >
                {/* Header of Station Card */}
                <div className="station-card-header">
                  <div className="station-title-wrap">
                    <span className="station-code-badge">ID: {station.id}</span>
                    <h4 className="station-name">{station.name}</h4>
                  </div>
                  {isBest ? (
                    <span className="badge-best-choice">
                      <Sparkles size={12} />
                      BEST OPTION
                    </span>
                  ) : !hasRequestedFuel ? (
                    <span className="badge-depleted">
                      <XCircle size={12} />
                      NO {currentFuelObj.short}
                    </span>
                  ) : (
                    <span className="badge-alternative">
                      ALTERNATIVE
                    </span>
                  )}
                </div>

                <p className="station-sublocation">
                  <MapPin size={13} className="text-muted" />
                  {station.location_label || `Station ${station.id} Corridor`}
                </p>

                {/* Primary Metrics: Distance, Queue, Wait, Total */}
                <div className="station-stats-row">
                  <div className="stat-box">
                    <span className="stat-title">Distance</span>
                    <span className="stat-number text-cyan">{station.distance_km} <span className="unit">km</span></span>
                    <span className="stat-extra">{travelTime} min drive</span>
                  </div>

                  <div className="stat-box">
                    <span className="stat-title">Queue Length</span>
                    <span className="stat-number text-amber">{station.queue_length} <span className="unit">veh</span></span>
                    <span className="stat-extra">{activePumpsCount}/3 pumps active</span>
                  </div>

                  <div className="stat-box">
                    <span className="stat-title">Queue Wait</span>
                    <span className="stat-number text-emerald">{waitTime} <span className="unit">min</span></span>
                    <span className="stat-extra">ML predicted</span>
                  </div>
                </div>

                {/* Total Journey Bar */}
                <div className="total-journey-block">
                  <div className="journey-header">
                    <span className="journey-title">Total Journey Time:</span>
                    <span className={`journey-total-value ${isBest ? 'text-emerald' : 'text-slate'}`}>
                      {totalTime} minutes
                    </span>
                  </div>
                  <div className="journey-progress-bar">
                    <div 
                      className="progress-segment travel" 
                      style={{ width: `${Math.min(100, (travelTime / (totalTime || 1)) * 100)}%` }}
                      title={`Travel: ${travelTime} min`}
                    />
                    <div 
                      className="progress-segment wait" 
                      style={{ width: `${Math.min(100, (waitTime / (totalTime || 1)) * 100)}%` }}
                      title={`Queue Wait: ${waitTime} min`}
                    />
                  </div>
                  <div className="journey-legend">
                    <span className="legend-item"><span className="legend-dot cyan" /> {travelTime}m Travel</span>
                    <span className="legend-item"><span className="legend-dot emerald" /> {waitTime}m Wait</span>
                  </div>
                </div>

                {/* Fuel Availability Grid */}
                <div className="card-fuel-section">
                  <span className="fuel-section-label">Fuel Availability:</span>
                  <div className="card-fuel-badges">
                    {FUEL_TYPES.map(fuel => {
                      const avail = station.fuel_availability?.[fuel.id];
                      const isTarget = fuel.id === selectedFuel;
                      return (
                        <div 
                          key={fuel.id}
                          className={`fuel-status-chip ${avail ? 'in-stock' : 'depleted'} ${isTarget ? 'target-fuel' : ''}`}
                        >
                          <span className="chip-name">{fuel.short}</span>
                          {avail ? (
                            <span className="chip-status text-emerald">Available</span>
                          ) : (
                            <span className="chip-status text-rose">Depleted</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Action */}
                <div className="station-card-actions">
                  <button
                    className="btn-card-predict"
                    onClick={() => {
                      setCustomStationId(station.id);
                      setShowPredictor(true);
                      handleRunPredict();
                    }}
                  >
                    <Sliders size={13} />
                    <span>Predict for My Vehicle</span>
                  </button>
                  <button
                    type="button"
                    className="btn-card-queue-action"
                    onClick={() => {
                      setRegStationId(station.id);
                      const el = document.getElementById('virtual-queue-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    <Ticket size={13} />
                    <span>Join Queue</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Clear Station Comparison Matrix */}
      <section className="comparison-table-section">
        <div className="section-header-row">
          <div className="header-titles">
            <h3 className="section-subheading">Side-by-Side Station Comparison</h3>
            <p className="section-caption">
              Direct metric evaluation comparing all 3 prototype stations for {currentFuelObj.label} from {currentLocation.name}.
            </p>
          </div>
        </div>

        <div className="table-responsive-wrapper">
          <table className="comparison-matrix-table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Distance</th>
                <th>Travel Time</th>
                <th>Current Queue</th>
                <th>Predicted Wait</th>
                <th>Total Journey</th>
                <th>{currentFuelObj.short} Status</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {displayStations.map((st) => {
                const isBest = st.id === bestStationId;
                const hasFuel = st.fuel_availability?.[selectedFuel];
                const total = st.total_time_min || (st.travel_time_min + st.predicted_wait_min);

                return (
                  <tr key={st.id} className={isBest ? 'row-recommended' : ''}>
                    <td className="cell-station-name">
                      <strong>{st.name}</strong>
                      <span className="cell-sub">{st.location_label}</span>
                    </td>
                    <td>{st.distance_km} km</td>
                    <td>{st.travel_time_min} min</td>
                    <td>
                      <span className="queue-pill">{st.queue_length} vehicles</span>
                    </td>
                    <td>
                      <strong className="text-emerald">{st.predicted_wait_min} min</strong>
                    </td>
                    <td>
                      <strong className={`total-pill ${isBest ? 'highlight' : ''}`}>{total} min</strong>
                    </td>
                    <td>
                      {hasFuel ? (
                        <span className="status-tag-stock in">
                          <CheckCircle2 size={13} /> In Stock
                        </span>
                      ) : (
                        <span className="status-tag-stock out">
                          <XCircle size={13} /> Out of Stock
                        </span>
                      )}
                    </td>
                    <td>
                      {isBest ? (
                        <span className="matrix-badge-rec">
                          <Sparkles size={13} /> Recommended #1
                        </span>
                      ) : !hasFuel ? (
                        <span className="matrix-badge-skip">Excluded (No Fuel)</span>
                      ) : (
                        <span className="matrix-badge-alt">Alternative</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* On-demand Predictor Modal / Drawer */}
      {showPredictor && (
        <div className="modal-overlay" onClick={() => setShowPredictor(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Sliders className="text-cyan" size={20} />
                <h3 className="modal-title">Live ML Queue Predictor (`POST /predict`)</h3>
              </div>
              <button className="btn-close" onClick={() => setShowPredictor(false)}>✕</button>
            </div>

            <div className="modal-body">
              <p className="modal-desc">
                Test the backend prediction endpoint with custom parameters for your vehicle type, fuel requirements, and station load.
              </p>

              <div className="modal-form-grid">
                <div className="form-group">
                  <label>Station:</label>
                  <select 
                    value={customStationId} 
                    onChange={(e) => setCustomStationId(e.target.value)}
                    className="modal-select"
                  >
                    {stations.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Vehicle Type:</label>
                  <select 
                    value={selectedVehicle} 
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                    className="modal-select"
                  >
                    {VEHICLE_TYPES.map(v => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fuel Type:</label>
                  <select 
                    value={selectedFuel} 
                    onChange={(e) => setSelectedFuel(e.target.value)}
                    className="modal-select"
                  >
                    {FUEL_TYPES.map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-action-row">
                <button 
                  className="btn-run-predict" 
                  onClick={handleRunPredict} 
                  disabled={isPredicting}
                >
                  <Zap size={15} />
                  <span>{isPredicting ? 'Computing Inference...' : 'Calculate Prediction'}</span>
                </button>
              </div>

              {predictionResult && (
                <div className="prediction-output-card">
                  <div className="output-header">
                    <span className="output-title">Model Response Result</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {predictionResult.is_trained_ml_model && (
                        <span className="output-source-pill" style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8' }}>
                          RandomForest ML
                        </span>
                      )}
                      <span className="output-source-pill">
                        {predictionResult.isDemo ? 'PROTOTYPE SIMULATED' : 'LIVE API'}
                      </span>
                    </div>
                  </div>

                  <div className="prediction-stat-grid">
                    <div className="pred-stat">
                      <span className="pred-label">Predicted Wait Time:</span>
                      <span className="pred-value emerald">{predictionResult.predicted_wait_min} min</span>
                    </div>
                    <div className="pred-stat">
                      <span className="pred-label">Confidence:</span>
                      <span className="pred-value cyan">{Math.round((predictionResult.confidence_score || 0.95) * 100)}%</span>
                    </div>
                    <div className="pred-stat">
                      <span className="pred-label">
                        {predictionResult.recommended_pump ? 'Assigned Pump:' : 'Target Station:'}
                      </span>
                      <span className="pred-value">
                        {predictionResult.recommended_pump || `Station ${predictionResult.station_id}`}
                      </span>
                    </div>
                  </div>

                  {predictionResult.status_note && (
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
                      {predictionResult.status_note}
                    </div>
                  )}

                  {predictionResult.breakdown && (
                    <div className="pred-breakdown-details">
                      <span>Queue Length: {predictionResult.breakdown.vehicle_queue}</span>
                      <span>Active Compatible Pumps: {predictionResult.breakdown.active_pumps}</span>
                      <span>Unit Service Rate: {predictionResult.breakdown.unit_service_time} min/veh</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
