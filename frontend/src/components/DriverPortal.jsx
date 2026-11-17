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
  Info 
} from 'lucide-react';
import { 
  PROTOTYPE_LOCATIONS, 
  FUEL_TYPES, 
  VEHICLE_TYPES, 
  computeRecommendation 
} from '../data/demoData';
import { getRecommendation, predictWaitTime } from '../services/api';

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
                    <span className="output-source-pill">
                      {predictionResult.isDemo ? 'PROTOTYPE SIMULATED' : 'LIVE API'}
                    </span>
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
                      <span className="pred-label">Target Station:</span>
                      <span className="pred-value">Station {predictionResult.station_id}</span>
                    </div>
                  </div>

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
