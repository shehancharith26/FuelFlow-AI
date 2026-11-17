"""
Synthetic prototype data and state store for the FuelFlow AI Kegalle scenario.

NOTICE:
PROTOTYPE — SIMULATED DATA.
All station locations, fuel inventories, pump telemetry, distances, and travel times
are fictional/synthetic for the BuildX 0.1 hackathon prototype.
"""

from copy import deepcopy
from typing import Any, Dict, List, Tuple

PROTOTYPE_DISCLAIMER = (
    "PROTOTYPE — SIMULATED DATA. Fictional Kegalle corridor stations, synthetic distances, "
    "simulated queues, and deterministic wait-time predictions. Not real-time GPS or live depot stock."
)

PROTOTYPE_LOCATIONS: List[Dict[str, Any]] = [
    {
        "id": "kegalle_clock_tower",
        "name": "Kegalle Town - Clock Tower (Center)",
        "area": "Kegalle Commercial Core",
        "coords": {"lat": 7.2513, "lng": 80.3464},
    },
    {
        "id": "kegalle_bypass",
        "name": "Kegalle Bypass Junction (Colombo-Kandy Rd)",
        "area": "A1 Highway Interchange",
        "coords": {"lat": 7.2589, "lng": 80.3552},
    },
    {
        "id": "kegalle_ranwala",
        "name": "Ranwala Junction (Valley Link)",
        "area": "Kegalle South Approach",
        "coords": {"lat": 7.2421, "lng": 80.3391},
    },
    {
        "id": "kegalle_bandaranayake",
        "name": "Bandaranayake Mawatha Commercial Strip",
        "area": "Main Market District",
        "coords": {"lat": 7.2485, "lng": 80.3488},
    },
]

# Synthetic driving distance (km) and travel time (min) from each origin to Stations A, B, C
DISTANCE_MATRIX: Dict[str, Dict[str, Dict[str, float]]] = {
    "kegalle_clock_tower": {
        "A": {"distance_km": 1.2, "travel_time_min": 4.0},
        "B": {"distance_km": 2.8, "travel_time_min": 7.0},
        "C": {"distance_km": 4.1, "travel_time_min": 9.0},
    },
    "kegalle_bypass": {
        "A": {"distance_km": 2.5, "travel_time_min": 6.0},
        "B": {"distance_km": 0.9, "travel_time_min": 3.0},
        "C": {"distance_km": 3.4, "travel_time_min": 8.0},
    },
    "kegalle_ranwala": {
        "A": {"distance_km": 3.8, "travel_time_min": 8.0},
        "B": {"distance_km": 4.5, "travel_time_min": 11.0},
        "C": {"distance_km": 1.4, "travel_time_min": 3.0},
    },
    "kegalle_bandaranayake": {
        "A": {"distance_km": 1.6, "travel_time_min": 4.0},
        "B": {"distance_km": 3.1, "travel_time_min": 8.0},
        "C": {"distance_km": 2.7, "travel_time_min": 6.0},
    },
}

# Service duration statistics (minutes) and fuel compatibility weights per vehicle type
VEHICLE_SPECS: Dict[str, Dict[str, Any]] = {
    "motorcycle": {
        "label": "Motorcycle / Scooter",
        "avg_service_min": 2.2,
        "std_service_min": 0.5,
        "min_service_min": 1.2,
        "max_service_min": 3.8,
        "normal_weight": 0.28,
        "peak_weight": 0.22,
        "fuel_probs": {"petrol_92": 0.90, "petrol_95": 0.10, "diesel": 0.00},
    },
    "three_wheeler": {
        "label": "Three Wheeler / TukTuk",
        "avg_service_min": 2.8,
        "std_service_min": 0.6,
        "min_service_min": 1.6,
        "max_service_min": 4.5,
        "normal_weight": 0.24,
        "peak_weight": 0.20,
        "fuel_probs": {"petrol_92": 0.92, "petrol_95": 0.00, "diesel": 0.08},
    },
    "car": {
        "label": "Car / Sedan / SUV",
        "avg_service_min": 4.5,
        "std_service_min": 1.0,
        "min_service_min": 2.5,
        "max_service_min": 7.5,
        "normal_weight": 0.28,
        "peak_weight": 0.28,
        "fuel_probs": {"petrol_92": 0.58, "petrol_95": 0.30, "diesel": 0.12},
    },
    "van": {
        "label": "Van / Light Commercial",
        "avg_service_min": 5.6,
        "std_service_min": 1.2,
        "min_service_min": 3.5,
        "max_service_min": 9.0,
        "normal_weight": 0.12,
        "peak_weight": 0.16,
        "fuel_probs": {"petrol_92": 0.20, "petrol_95": 0.05, "diesel": 0.75},
    },
    "lorry": {
        "label": "Lorry / Heavy Transport",
        "avg_service_min": 8.0,
        "std_service_min": 1.6,
        "min_service_min": 5.0,
        "max_service_min": 12.5,
        "normal_weight": 0.08,
        "peak_weight": 0.14,
        "fuel_probs": {"petrol_92": 0.00, "petrol_95": 0.00, "diesel": 1.00},
    },
}

DEFAULT_STATIONS: List[Dict[str, Any]] = [
    {
        "id": "A",
        "name": "Station A - Kegalle Central Hub",
        "short_name": "Station A",
        "location_label": "Main Street, Kegalle (Prototype Station A)",
        "distance_km": 1.2,
        "travel_time_min": 4.0,
        "fuel_availability": {
            "petrol_92": True,
            "petrol_95": True,
            "diesel": True,
        },
        "queue_length": 8,
        "predicted_wait_min": 11.0,
        "total_vehicles_served": 68,
        "pumps": [
            {
                "id": 1,
                "name": "Pump 1",
                "fuel_types": ["petrol_92", "petrol_95"],
                "status": "active",
                "current_vehicle": {
                    "id": "WP-CAB-4012",
                    "type": "car",
                    "fuel": "petrol_92",
                    "remaining_sec": 110,
                },
                "queue_count": 3,
                "utilization": 86.0,
                "flow_rate_lpm": 38.0,
            },
            {
                "id": 2,
                "name": "Pump 2",
                "fuel_types": ["petrol_92", "petrol_95"],
                "status": "active",
                "current_vehicle": {
                    "id": "WP-AA-9182",
                    "type": "three_wheeler",
                    "fuel": "petrol_92",
                    "remaining_sec": 65,
                },
                "queue_count": 3,
                "utilization": 81.0,
                "flow_rate_lpm": 35.0,
            },
            {
                "id": 3,
                "name": "Pump 3",
                "fuel_types": ["petrol_92", "petrol_95", "diesel"],
                "status": "active",
                "current_vehicle": {
                    "id": "CP-ND-5510",
                    "type": "van",
                    "fuel": "diesel",
                    "remaining_sec": 140,
                },
                "queue_count": 2,
                "utilization": 84.0,
                "flow_rate_lpm": 42.0,
            },
        ],
    },
    {
        "id": "B",
        "name": "Station B - Highway Bypass Gateway",
        "short_name": "Station B",
        "location_label": "Bypass Interchange, Kegalle (Prototype Station B)",
        "distance_km": 2.8,
        "travel_time_min": 7.0,
        "fuel_availability": {
            "petrol_92": True,
            "petrol_95": False,
            "diesel": True,
        },
        "queue_length": 15,
        "predicted_wait_min": 21.0,
        "total_vehicles_served": 52,
        "pumps": [
            {
                "id": 1,
                "name": "Pump 1",
                "fuel_types": ["petrol_92", "petrol_95"],
                "status": "active",
                "current_vehicle": {
                    "id": "WP-BCZ-1102",
                    "type": "motorcycle",
                    "fuel": "petrol_92",
                    "remaining_sec": 45,
                },
                "queue_count": 7,
                "utilization": 93.0,
                "flow_rate_lpm": 36.0,
            },
            {
                "id": 2,
                "name": "Pump 2",
                "fuel_types": ["petrol_92", "petrol_95"],
                "status": "maintenance",
                "current_vehicle": None,
                "queue_count": 0,
                "utilization": 0.0,
                "flow_rate_lpm": 0.0,
            },
            {
                "id": 3,
                "name": "Pump 3",
                "fuel_types": ["petrol_92", "petrol_95", "diesel"],
                "status": "active",
                "current_vehicle": {
                    "id": "EP-LA-3091",
                    "type": "lorry",
                    "fuel": "diesel",
                    "remaining_sec": 210,
                },
                "queue_count": 8,
                "utilization": 95.0,
                "flow_rate_lpm": 45.0,
            },
        ],
    },
    {
        "id": "C",
        "name": "Station C - Valley Link Depot",
        "short_name": "Station C",
        "location_label": "Ranwala South Road, Kegalle (Prototype Station C)",
        "distance_km": 4.1,
        "travel_time_min": 9.0,
        "fuel_availability": {
            "petrol_92": True,
            "petrol_95": True,
            "diesel": False,
        },
        "queue_length": 4,
        "predicted_wait_min": 6.0,
        "total_vehicles_served": 50,
        "pumps": [
            {
                "id": 1,
                "name": "Pump 1",
                "fuel_types": ["petrol_92", "petrol_95"],
                "status": "active",
                "current_vehicle": {
                    "id": "WP-CAD-8812",
                    "type": "car",
                    "fuel": "petrol_95",
                    "remaining_sec": 90,
                },
                "queue_count": 2,
                "utilization": 64.0,
                "flow_rate_lpm": 39.0,
            },
            {
                "id": 2,
                "name": "Pump 2",
                "fuel_types": ["petrol_92", "petrol_95"],
                "status": "active",
                "current_vehicle": {
                    "id": "WP-BBL-2009",
                    "type": "motorcycle",
                    "fuel": "petrol_92",
                    "remaining_sec": 40,
                },
                "queue_count": 1,
                "utilization": 60.0,
                "flow_rate_lpm": 37.0,
            },
            {
                "id": 3,
                "name": "Pump 3",
                "fuel_types": ["petrol_92", "petrol_95", "diesel"],
                "status": "idle",
                "current_vehicle": None,
                "queue_count": 1,
                "utilization": 45.0,
                "flow_rate_lpm": 40.0,
            },
        ],
    },
]

# In-memory mutable station store so simulations can update station queue states
_CURRENT_STATIONS: List[Dict[str, Any]] = deepcopy(DEFAULT_STATIONS)


def get_stations_state() -> List[Dict[str, Any]]:
    """Return a deep copy of current prototype stations."""
    return deepcopy(_CURRENT_STATIONS)


def reset_stations_state() -> List[Dict[str, Any]]:
    """Reset stations state to initial prototype configuration."""
    global _CURRENT_STATIONS
    _CURRENT_STATIONS = deepcopy(DEFAULT_STATIONS)
    return deepcopy(_CURRENT_STATIONS)


def update_stations_from_simulation(station_metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Update in-memory station telemetry from completed simulation metrics."""
    global _CURRENT_STATIONS
    for st in _CURRENT_STATIONS:
        sid = st["id"]
        if sid in station_metrics:
            m = station_metrics[sid]
            st["queue_length"] = int(m.get("queue_length", st["queue_length"]))
            st["predicted_wait_min"] = round(float(m.get("avg_wait_min", st["predicted_wait_min"])), 1)
            st["total_vehicles_served"] = int(m.get("vehicles_served", st["total_vehicles_served"]))
            pump_utils = m.get("pump_utilization", {})
            active_pumps = [p for p in st["pumps"] if p["status"] != "maintenance"]
            num_active = max(1, len(active_pumps))
            base_q = st["queue_length"] // num_active
            rem_q = st["queue_length"] % num_active
            active_idx = 0
            for pump in st["pumps"]:
                pid = pump["id"]
                if pump["status"] == "maintenance":
                    pump["queue_count"] = 0
                    pump["utilization"] = 0.0
                else:
                    pump["queue_count"] = base_q + (1 if active_idx < rem_q else 0)
                    active_idx += 1
                    if pid in pump_utils:
                        pump["utilization"] = round(float(pump_utils[pid]), 1)
    return deepcopy(_CURRENT_STATIONS)


def resolve_location(location_str: str | None, location_id: str | None = None) -> Tuple[str, str]:
    """
    Resolve a location ID or human-readable location string to (location_id, location_name).
    Defaults to ('kegalle_clock_tower', 'Kegalle Town - Clock Tower (Center)').
    """
    if location_id:
        for loc in PROTOTYPE_LOCATIONS:
            if loc["id"] == location_id.strip().lower():
                return loc["id"], loc["name"]

    if location_str:
        norm = location_str.strip().lower()
        for loc in PROTOTYPE_LOCATIONS:
            if norm == loc["id"] or norm == loc["name"].lower():
                return loc["id"], loc["name"]
        if "bypass" in norm or "highway" in norm:
            return "kegalle_bypass", PROTOTYPE_LOCATIONS[1]["name"]
        if "ranwala" in norm or "valley" in norm or "south" in norm:
            return "kegalle_ranwala", PROTOTYPE_LOCATIONS[2]["name"]
        if "bandaranayake" in norm or "market" in norm or "strip" in norm:
            return "kegalle_bandaranayake", PROTOTYPE_LOCATIONS[3]["name"]
        if "clock" in norm or "center" in norm or "kegalle" in norm or "town" in norm:
            return "kegalle_clock_tower", PROTOTYPE_LOCATIONS[0]["name"]

    return "kegalle_clock_tower", PROTOTYPE_LOCATIONS[0]["name"]
