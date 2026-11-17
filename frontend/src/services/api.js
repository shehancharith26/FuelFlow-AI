/**
 * FuelFlow AI - API Service Layer
 * Connects to FastAPI / Python backend at http://localhost:8000
 * Graceful fallback to demoData if backend is unavailable.
 */

import { INITIAL_STATIONS, STRATEGY_COMPARISON, computeRecommendation } from '../data/demoData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 3500;

/**
 * Fetch wrapper with timeout and robust error trapping
 */
async function apiFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const url = `${API_BASE_URL.replace(/\/$/, '')}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      isDemo: false,
      data
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      success: false,
      isDemo: true,
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message
    };
  }
}

/**
 * Validates station object schema according to hackathon contract
 */
export function validateStationObject(st) {
  if (!st || typeof st !== 'object') return false;
  return (
    typeof st.id === 'string' &&
    typeof st.name === 'string' &&
    typeof st.distance_km === 'number' &&
    typeof st.travel_time_min === 'number' &&
    st.fuel_availability &&
    typeof st.fuel_availability.petrol_92 === 'boolean' &&
    typeof st.fuel_availability.petrol_95 === 'boolean' &&
    typeof st.fuel_availability.diesel === 'boolean' &&
    typeof st.queue_length === 'number' &&
    typeof st.predicted_wait_min === 'number' &&
    Array.isArray(st.pumps)
  );
}

/**
 * GET /health
 */
export async function getHealth() {
  const res = await apiFetch('/health');
  if (res.success && res.data) {
    return {
      online: true,
      data: res.data,
      isDemo: false
    };
  }
  return {
    online: false,
    error: res.error,
    isDemo: true
  };
}

/**
 * GET /stations
 * Returns list of fuel stations [Station A, Station B, Station C]
 */
export async function getStations() {
  const res = await apiFetch('/stations');
  if (res.success && Array.isArray(res.data) && res.data.length > 0) {
    // Validate each station
    const valid = res.data.every(validateStationObject);
    if (valid) {
      return {
        stations: res.data,
        isDemo: false,
        error: null
      };
    }
  }

  // Graceful fallback to verified prototype demo stations
  return {
    stations: INITIAL_STATIONS,
    isDemo: true,
    error: res.error || 'Using prototype demo stations'
  };
}

/**
 * POST /recommend
 * Payload: { "location": "Kegalle", "fuel_type": "petrol_92" }
 */
export async function getRecommendation({ location = 'Kegalle', fuel_type = 'petrol_92', location_id = 'kegalle_clock_tower' }) {
  const payload = {
    location,
    fuel_type
  };

  const res = await apiFetch('/recommend', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (res.success && res.data && res.data.recommended_station) {
    return {
      recommendation: res.data,
      isDemo: false,
      error: null
    };
  }

  // Compute recommendation deterministically with demo data
  const localRec = computeRecommendation(INITIAL_STATIONS, location_id, fuel_type);
  return {
    recommendation: {
      location,
      fuel_type,
      recommended_station: localRec.recommended_station,
      all_stations: localRec.all_stations,
      rationale: `${localRec.recommended_station.name} offers the lowest total journey + wait turnaround (${localRec.recommended_station.total_time_min} mins) with confirmed ${fuel_type.replace('_', ' ').toUpperCase()} availability.`
    },
    isDemo: true,
    error: res.error || null
  };
}

/**
 * POST /predict
 * Payload:
 * {
 *   "station_id": "A",
 *   "fuel_type": "petrol_92",
 *   "vehicle_type": "car",
 *   "queue_length": 4,
 *   "active_compatible_pumps": 2,
 *   "estimated_service_min": 5,
 *   "workload_min": 12
 * }
 */
export async function predictWaitTime(params) {
  const payload = {
    station_id: params.station_id || 'A',
    fuel_type: params.fuel_type || 'petrol_92',
    vehicle_type: params.vehicle_type || 'car',
    queue_length: Number(params.queue_length) || 4,
    active_compatible_pumps: Number(params.active_compatible_pumps) || 2,
    estimated_service_min: Number(params.estimated_service_min) || 5,
    workload_min: Number(params.workload_min) || 12
  };

  const res = await apiFetch('/predict', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (res.success && res.data && typeof res.data.predicted_wait_min === 'number') {
    return {
      ...res.data,
      isDemo: false
    };
  }

  // Realistic queue formula for demo calculation:
  // queue_length * (estimated_service_min / max(1, active_compatible_pumps))
  const computedWait = Math.max(
    2,
    Math.round((payload.queue_length * payload.estimated_service_min) / Math.max(1, payload.active_compatible_pumps))
  );

  return {
    station_id: payload.station_id,
    predicted_wait_min: computedWait,
    confidence_score: 0.94,
    model_version: "Simulated-QueueNet-v1.4",
    isDemo: true,
    breakdown: {
      active_pumps: payload.active_compatible_pumps,
      vehicle_queue: payload.queue_length,
      unit_service_time: payload.estimated_service_min
    }
  };
}

/**
 * POST /simulate
 * Payload: { "vehicle_count": 200, "scenario": "normal", "seed": 42 }
 */
export async function runSimulation({ vehicle_count = 200, scenario = 'normal', seed = 42 }) {
  const payload = {
    vehicle_count: Number(vehicle_count),
    scenario,
    seed: Number(seed)
  };

  const res = await apiFetch('/simulate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (res.success && res.data) {
    return {
      ...res.data,
      isDemo: false
    };
  }

  // Simulated output calibrated around 200 vehicles
  const isPeak = scenario === 'peak';
  const multiplier = (vehicle_count / 200) * (isPeak ? 1.45 : 1.0);

  return {
    isDemo: true,
    scenario,
    vehicle_count,
    seed,
    results: {
      total_vehicles_simulated: vehicle_count,
      vehicles_served: Math.round(vehicle_count * (isPeak ? 0.88 : 0.96)),
      active_pumps_total: isPeak ? 8 : 8, // 1 in maintenance at Station B
      system_avg_wait_min: +(10.2 * multiplier).toFixed(1),
      system_max_wait_min: +(21.5 * multiplier).toFixed(1),
      station_metrics: {
        A: {
          vehicles_served: Math.round(vehicle_count * 0.38),
          avg_wait_min: +(9.1 * multiplier).toFixed(1),
          max_wait_min: +(18.0 * multiplier).toFixed(1),
          queue_length: Math.round(8 * multiplier),
          active_pumps: 3
        },
        B: {
          vehicles_served: Math.round(vehicle_count * 0.28),
          avg_wait_min: +(14.8 * multiplier).toFixed(1),
          max_wait_min: +(26.0 * multiplier).toFixed(1),
          queue_length: Math.round(15 * multiplier),
          active_pumps: 2
        },
        C: {
          vehicles_served: Math.round(vehicle_count * 0.34),
          avg_wait_min: +(6.7 * multiplier).toFixed(1),
          max_wait_min: +(13.5 * multiplier).toFixed(1),
          queue_length: Math.round(4 * multiplier),
          active_pumps: 3
        }
      }
    }
  };
}

/**
 * POST /compare
 * Payload: { "vehicle_count": 200, "seed": 42 }
 */
export async function compareStrategies({ vehicle_count = 200, seed = 42 }) {
  const payload = {
    vehicle_count: Number(vehicle_count),
    seed: Number(seed)
  };

  const res = await apiFetch('/compare', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (res.success && res.data && res.data.overall) {
    return {
      ...res.data,
      isDemo: false
    };
  }

  // Dynamic scaling based on vehicle_count
  const ratio = vehicle_count / 200;
  const fixedAvg = +(STRATEGY_COMPARISON.overall.fixed_fcfs.avg_wait_min * ratio).toFixed(1);
  const smartAvg = +(STRATEGY_COMPARISON.overall.smart_allocation.avg_wait_min * ratio).toFixed(1);
  const fixedMax = +(STRATEGY_COMPARISON.overall.fixed_fcfs.max_wait_min * ratio).toFixed(1);
  const smartMax = +(STRATEGY_COMPARISON.overall.smart_allocation.max_wait_min * ratio).toFixed(1);
  const reduction = +(((fixedAvg - smartAvg) / fixedAvg) * 100).toFixed(1);

  return {
    isDemo: true,
    overall: {
      total_vehicles: vehicle_count,
      fixed_fcfs: {
        avg_wait_min: fixedAvg,
        max_wait_min: fixedMax,
        throughput_per_hr: STRATEGY_COMPARISON.overall.fixed_fcfs.throughput_per_hr,
        bottleneck_events: Math.round(28 * ratio),
        pump_idle_time_pct: 19.5
      },
      smart_allocation: {
        avg_wait_min: smartAvg,
        max_wait_min: smartMax,
        throughput_per_hr: STRATEGY_COMPARISON.overall.smart_allocation.throughput_per_hr,
        bottleneck_events: Math.round(4 * ratio),
        pump_idle_time_pct: 4.8
      },
      improvement: {
        wait_reduction_pct: reduction,
        max_wait_reduction_pct: +(((fixedMax - smartMax) / fixedMax) * 100).toFixed(1),
        throughput_gain_pct: STRATEGY_COMPARISON.overall.improvement.throughput_gain_pct,
        efficiency_score: 94
      }
    },
    station_breakdown: STRATEGY_COMPARISON.station_breakdown.map(s => ({
      ...s,
      fixed_avg_wait: +(s.fixed_avg_wait * ratio).toFixed(1),
      smart_avg_wait: +(s.smart_avg_wait * ratio).toFixed(1),
      fixed_max_wait: +(s.fixed_max_wait * ratio).toFixed(1),
      smart_max_wait: +(s.smart_max_wait * ratio).toFixed(1)
    })),
    timeline_chart: STRATEGY_COMPARISON.timeline_chart.map(t => ({
      ...t,
      fcfs_wait: +(t.fcfs_wait * ratio).toFixed(1),
      smart_wait: +(t.smart_wait * ratio).toFixed(1)
    })),
    pump_utilization_chart: STRATEGY_COMPARISON.pump_utilization_chart
  };
}
