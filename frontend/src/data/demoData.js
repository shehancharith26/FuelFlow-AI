/**
 * FuelFlow AI - Prototype Demo Data
 * Fictional simulation datasets for Kegalle prototype scenario
 * 
 * NOTICE:
 * "PROTOTYPE — SIMULATED DATA"
 * Fictional prototype fuel stations, simulated queues, and synthetic ML allocation figures.
 * Not real-time GPS or actual fuel depot inventory.
 */

export const PROTOTYPE_LOCATIONS = [
  {
    id: "kegalle_clock_tower",
    name: "Kegalle Town - Clock Tower (Center)",
    area: "Kegalle Commercial Core",
    coords: { lat: 7.2513, lng: 80.3464 }
  },
  {
    id: "kegalle_bypass",
    name: "Kegalle Bypass Junction (Colombo-Kandy Rd)",
    area: "A1 Highway Interchange",
    coords: { lat: 7.2589, lng: 80.3552 }
  },
  {
    id: "kegalle_ranwala",
    name: "Ranwala Junction (Valley Link)",
    area: "Kegalle South Approach",
    coords: { lat: 7.2421, lng: 80.3391 }
  },
  {
    id: "kegalle_bandaranayake",
    name: "Bandaranayake Mawatha Commercial Strip",
    area: "Main Market District",
    coords: { lat: 7.2485, lng: 80.3488 }
  }
];

export const FUEL_TYPES = [
  { id: "petrol_92", label: "Petrol 92 Octane", short: "P92", color: "#10B981" },
  { id: "petrol_95", label: "Petrol 95 Octane Euro 4", short: "P95", color: "#06B6D4" },
  { id: "diesel", label: "Auto Diesel Super", short: "Diesel", color: "#F59E0B" }
];

export const VEHICLE_TYPES = [
  { id: "car", label: "Car / Sedan / SUV", avg_service_min: 4.5, icon: "Car" },
  { id: "motorcycle", label: "Motorcycle / Scooter", avg_service_min: 2.5, icon: "Bike" },
  { id: "three_wheeler", label: "Three Wheeler / TukTuk", avg_service_min: 3.0, icon: "Navigation" },
  { id: "van", label: "Van / Light Commercial", avg_service_min: 5.5, icon: "Truck" },
  { id: "lorry", label: "Lorry / Heavy Transport", avg_service_min: 8.0, icon: "Container" }
];

// Fictional distance & travel matrix from prototype origins to stations
export const DISTANCE_MATRIX = {
  kegalle_clock_tower: {
    A: { distance_km: 1.2, travel_time_min: 4 },
    B: { distance_km: 2.8, travel_time_min: 7 },
    C: { distance_km: 4.1, travel_time_min: 9 }
  },
  kegalle_bypass: {
    A: { distance_km: 2.5, travel_time_min: 6 },
    B: { distance_km: 0.9, travel_time_min: 3 },
    C: { distance_km: 3.4, travel_time_min: 8 }
  },
  kegalle_ranwala: {
    A: { distance_km: 3.8, travel_time_min: 8 },
    B: { distance_km: 4.5, travel_time_min: 11 },
    C: { distance_km: 1.4, travel_time_min: 3 }
  },
  kegalle_bandaranayake: {
    A: { distance_km: 1.6, travel_time_min: 4 },
    B: { distance_km: 3.1, travel_time_min: 8 },
    C: { distance_km: 2.7, travel_time_min: 6 }
  }
};

// 3 Prototype Fuel Stations with exactly 3 pumps each
export const INITIAL_STATIONS = [
  {
    id: "A",
    name: "Station A - Kegalle Central Hub",
    short_name: "Station A",
    location_label: "Main Street, Kegalle (Prototype Station A)",
    distance_km: 1.2,
    travel_time_min: 4,
    fuel_availability: {
      petrol_92: true,
      petrol_95: true,
      diesel: true
    },
    queue_length: 8,
    predicted_wait_min: 12,
    total_vehicles_served: 68,
    pumps: [
      {
        id: 1,
        name: "Pump 1",
        fuel_types: ["petrol_92", "petrol_95"],
        status: "active",
        current_vehicle: { id: "WP-CAB-4012", type: "car", fuel: "petrol_92", remaining_sec: 110 },
        queue_count: 3,
        utilization: 88,
        flow_rate_lpm: 38
      },
      {
        id: 2,
        name: "Pump 2",
        fuel_types: ["petrol_92", "petrol_95"],
        status: "active",
        current_vehicle: { id: "WP-AA-9182", type: "three_wheeler", fuel: "petrol_92", remaining_sec: 65 },
        queue_count: 3,
        utilization: 82,
        flow_rate_lpm: 35
      },
      {
        id: 3,
        name: "Pump 3",
        fuel_types: ["petrol_92", "petrol_95", "diesel"],
        status: "active",
        current_vehicle: { id: "CP-ND-5510", type: "van", fuel: "diesel", remaining_sec: 140 },
        queue_count: 2,
        utilization: 85,
        flow_rate_lpm: 42
      }
    ]
  },
  {
    id: "B",
    name: "Station B - Highway Bypass Gateway",
    short_name: "Station B",
    location_label: "Bypass Interchange, Kegalle (Prototype Station B)",
    distance_km: 2.8,
    travel_time_min: 7,
    fuel_availability: {
      petrol_92: true,
      petrol_95: false,
      diesel: true
    },
    queue_length: 15,
    predicted_wait_min: 22,
    total_vehicles_served: 52,
    pumps: [
      {
        id: 1,
        name: "Pump 1",
        fuel_types: ["petrol_92", "petrol_95"],
        status: "active",
        current_vehicle: { id: "WP-BCZ-1102", type: "motorcycle", fuel: "petrol_92", remaining_sec: 45 },
        queue_count: 7,
        utilization: 94,
        flow_rate_lpm: 36
      },
      {
        id: 2,
        name: "Pump 2",
        fuel_types: ["petrol_92", "petrol_95"],
        status: "maintenance",
        current_vehicle: null,
        queue_count: 0,
        utilization: 24,
        flow_rate_lpm: 0
      },
      {
        id: 3,
        name: "Pump 3",
        fuel_types: ["petrol_92", "petrol_95", "diesel"],
        status: "active",
        current_vehicle: { id: "EP-LA-3091", type: "lorry", fuel: "diesel", remaining_sec: 210 },
        queue_count: 8,
        utilization: 96,
        flow_rate_lpm: 45
      }
    ]
  },
  {
    id: "C",
    name: "Station C - Valley Link Depot",
    short_name: "Station C",
    location_label: "Ranwala South Road, Kegalle (Prototype Station C)",
    distance_km: 4.1,
    travel_time_min: 9,
    fuel_availability: {
      petrol_92: true,
      petrol_95: true,
      diesel: false
    },
    queue_length: 4,
    predicted_wait_min: 6,
    total_vehicles_served: 50,
    pumps: [
      {
        id: 1,
        name: "Pump 1",
        fuel_types: ["petrol_92", "petrol_95"],
        status: "active",
        current_vehicle: { id: "WP-CAD-8812", type: "car", fuel: "petrol_95", remaining_sec: 90 },
        queue_count: 2,
        utilization: 64,
        flow_rate_lpm: 39
      },
      {
        id: 2,
        name: "Pump 2",
        fuel_types: ["petrol_92", "petrol_95"],
        status: "active",
        current_vehicle: { id: "WP-BBL-2009", type: "motorcycle", fuel: "petrol_92", remaining_sec: 40 },
        queue_count: 1,
        utilization: 60,
        flow_rate_lpm: 37
      },
      {
        id: 3,
        name: "Pump 3",
        fuel_types: ["petrol_92", "petrol_95", "diesel"],
        status: "idle",
        current_vehicle: null,
        queue_count: 1,
        utilization: 45,
        flow_rate_lpm: 40
      }
    ]
  }
];

// Strategy Comparison Dataset (Fixed FCFS vs FuelFlow Smart Allocation)
export const STRATEGY_COMPARISON = {
  overall: {
    total_vehicles: 200,
    fixed_fcfs: {
      avg_wait_min: 18.4,
      max_wait_min: 38.0,
      throughput_per_hr: 54.2,
      bottleneck_events: 28,
      pump_idle_time_pct: 19.5
    },
    smart_allocation: {
      avg_wait_min: 9.8,
      max_wait_min: 19.2,
      throughput_per_hr: 83.6,
      bottleneck_events: 4,
      pump_idle_time_pct: 4.8
    },
    improvement: {
      wait_reduction_pct: 46.7,
      max_wait_reduction_pct: 49.5,
      throughput_gain_pct: 54.2,
      efficiency_score: 94
    }
  },
  station_breakdown: [
    {
      station_id: "A",
      name: "Station A",
      fixed_avg_wait: 16.5,
      smart_avg_wait: 8.9,
      fixed_max_wait: 33.0,
      smart_max_wait: 16.5,
      fixed_throughput: 58.0,
      smart_throughput: 86.4,
      vehicles_allocated: 75
    },
    {
      station_id: "B",
      name: "Station B",
      fixed_avg_wait: 24.2,
      smart_avg_wait: 13.5,
      fixed_max_wait: 46.0,
      smart_max_wait: 24.0,
      fixed_throughput: 42.5,
      smart_throughput: 71.0,
      vehicles_allocated: 65
    },
    {
      station_id: "C",
      name: "Station C",
      fixed_avg_wait: 14.5,
      smart_avg_wait: 7.0,
      fixed_max_wait: 29.0,
      smart_max_wait: 13.0,
      fixed_throughput: 62.0,
      smart_throughput: 93.5,
      vehicles_allocated: 60
    }
  ],
  timeline_chart: [
    { time: "00-10m", fcfs_wait: 8.5, smart_wait: 5.2, throughput_fcfs: 9, throughput_smart: 14 },
    { time: "10-20m", fcfs_wait: 14.2, smart_wait: 7.8, throughput_fcfs: 17, throughput_smart: 27 },
    { time: "20-30m", fcfs_wait: 21.0, smart_wait: 10.4, throughput_fcfs: 26, throughput_smart: 42 },
    { time: "30-40m", fcfs_wait: 26.8, smart_wait: 12.1, throughput_fcfs: 35, throughput_smart: 56 },
    { time: "40-50m", fcfs_wait: 24.5, smart_wait: 10.8, throughput_fcfs: 44, throughput_smart: 70 },
    { time: "50-60m", fcfs_wait: 18.4, smart_wait: 8.5, throughput_fcfs: 54, throughput_smart: 84 }
  ],
  pump_utilization_chart: [
    { name: "P1 (P92/P95)", fcfs_util: 96, smart_util: 88, balance: "+8% Headroom" },
    { name: "P2 (P92/P95)", fcfs_util: 58, smart_util: 84, balance: "+26% Loaded" },
    { name: "P3 (P92/P95/D)", fcfs_util: 98, smart_util: 85, balance: "Protected for Diesel" }
  ]
};

// Recent Smart Pump Allocation Log (showing AI decision rationale)
export const SAMPLE_ALLOCATION_LOG = [
  {
    id: "LOG-201",
    vehicle_id: "WP-CBA-9011",
    vehicle_type: "car",
    fuel: "petrol_92",
    assigned_station: "A",
    assigned_pump: "Pump 2",
    reason: "Pump 2 queue shorter; reserves Pump 3 for imminent diesel lorries",
    saved_wait_min: 6.2,
    timestamp: "Just now"
  },
  {
    id: "LOG-200",
    vehicle_id: "SP-ND-7712",
    vehicle_type: "lorry",
    fuel: "diesel",
    assigned_station: "A",
    assigned_pump: "Pump 3",
    reason: "Dedicated diesel capability match; optimal clearance window",
    saved_wait_min: 11.5,
    timestamp: "1 min ago"
  },
  {
    id: "LOG-199",
    vehicle_id: "CP-BI-4409",
    vehicle_type: "motorcycle",
    fuel: "petrol_92",
    assigned_station: "C",
    assigned_pump: "Pump 1",
    reason: "Fast 2-minute cycle time grouped to maximize throughput",
    saved_wait_min: 4.0,
    timestamp: "2 mins ago"
  },
  {
    id: "LOG-198",
    vehicle_id: "WP-KW-1290",
    vehicle_type: "van",
    fuel: "petrol_95",
    assigned_station: "A",
    assigned_pump: "Pump 1",
    reason: "Direct slot match; queue length equalized across P1/P2",
    saved_wait_min: 5.8,
    timestamp: "3 mins ago"
  },
  {
    id: "LOG-197",
    vehicle_id: "WP-AA-6512",
    vehicle_type: "three_wheeler",
    fuel: "petrol_92",
    assigned_station: "B",
    assigned_pump: "Pump 1",
    reason: "Pump 2 offline for inspection; slotted before heavy diesel batch",
    saved_wait_min: 7.1,
    timestamp: "4 mins ago"
  }
];

// Helper to calculate best station recommendation locally
export function computeRecommendation(stations, locationId, fuelType) {
  const distances = DISTANCE_MATRIX[locationId] || DISTANCE_MATRIX.kegalle_clock_tower;
  
  const evaluated = stations.map(station => {
    const locInfo = distances[station.id] || { distance_km: station.distance_km, travel_time_min: station.travel_time_min };
    const hasFuel = Boolean(station.fuel_availability && station.fuel_availability[fuelType]);
    const travelTime = locInfo.travel_time_min;
    const waitTime = station.predicted_wait_min;
    const totalTime = travelTime + waitTime;

    // Score: Lower is better. If fuel unavailable, heavily penalize (+9999)
    let score = totalTime;
    let rankPenalty = 0;
    if (!hasFuel) {
      score += 9999;
      rankPenalty = 1000;
    }

    return {
      ...station,
      distance_km: locInfo.distance_km,
      travel_time_min: travelTime,
      total_time_min: totalTime,
      has_requested_fuel: hasFuel,
      score,
      rankPenalty
    };
  });

  // Sort by score ascending (lowest total time among stations with fuel available)
  evaluated.sort((a, b) => a.score - b.score);
  const best = evaluated[0];

  return {
    best_station_id: best?.id || "A",
    recommended_station: best,
    all_stations: evaluated,
    criteria: {
      fuel_type: fuelType,
      location_id: locationId,
      fuel_available_filter: true
    }
  };
}
