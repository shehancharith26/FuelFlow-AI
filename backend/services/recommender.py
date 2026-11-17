"""
Station Recommendation Service for FuelFlow AI.

Evaluates prototype stations (A, B, C) for a driver's origin, fuel type, and vehicle type:
- Filters strictly for stations where:
  1. Requested fuel is available (`fuel_availability[fuel_type] == True`), AND
  2. At least one compatible pump is operational (`status != 'maintenance'` and `fuel_type in pump.fuel_types`).
- Computes dynamic queue wait using the modular `predictor` service so changes in fuel type,
  vehicle type, origin, queue length, or pump status immediately update the ranking.
- Ranks eligible stations by minimum `total_time_min = travel_time_min + predicted_wait_min`.
"""

from copy import deepcopy
from typing import Any, Dict, List, Optional

from backend.data import (
    DISTANCE_MATRIX,
    PROTOTYPE_DISCLAIMER,
    get_stations_state,
    resolve_location,
)
from backend.services.predictor import get_predictor


def recommend_station_service(
    location: str = "Kegalle",
    fuel_type: str = "petrol_92",
    location_id: Optional[str] = None,
    vehicle_type: str = "car",
    stations_override: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Evaluate all stations for the given driver parameters and return:
    - `recommended_station`: best eligible station (or None if no station can serve the request)
    - `ranked_stations`: eligible stations ordered by lowest total journey time
    - `all_stations`: all stations ordered by score (eligible first, ineligible penalized)
    - `rationale`: transparent explanation of why the station was selected
    """
    resolved_loc_id, resolved_loc_name = resolve_location(location, location_id)
    distances_for_origin = DISTANCE_MATRIX.get(
        resolved_loc_id, DISTANCE_MATRIX["kegalle_clock_tower"]
    )

    stations = deepcopy(stations_override) if stations_override is not None else get_stations_state()
    predictor = get_predictor()

    evaluated_all: List[Dict[str, Any]] = []

    for st in stations:
        sid = st["id"]
        loc_metrics = distances_for_origin.get(
            sid,
            {
                "distance_km": float(st.get("distance_km", 2.5)),
                "travel_time_min": float(st.get("travel_time_min", 6.0)),
            },
        )
        distance_km = float(loc_metrics["distance_km"])
        travel_time_min = float(loc_metrics["travel_time_min"])

        fuel_avail = st.get("fuel_availability", {})
        has_fuel = bool(fuel_avail.get(fuel_type, False))
        compatible_op_pumps = [
            p
            for p in st.get("pumps", [])
            if p.get("status") != "maintenance" and fuel_type in p.get("fuel_types", [])
        ]
        has_compatible_pump = len(compatible_op_pumps) > 0
        eligible = has_fuel and has_compatible_pump

        # Predict queue wait dynamically for this station, fuel_type, and vehicle_type
        pred = predictor.predict(
            station=st,
            fuel_type=fuel_type,
            vehicle_type=vehicle_type,
        )

        if eligible:
            wait_min = round(float(pred["predicted_wait_min"]), 1)
            total_time_min = round(travel_time_min + wait_min, 1)
            score = total_time_min
            rank_penalty = 0
            exclusion_reason = None
            rec_pump = pred.get("recommended_pump")
        else:
            # Keep station's baseline wait for UI display, but apply heavy penalty so it is never recommended
            wait_min = round(float(st.get("predicted_wait_min", 20.0)), 1)
            total_time_min = round(travel_time_min + wait_min, 1)
            rank_penalty = 1000
            score = total_time_min + 9999.0
            rec_pump = None
            if not has_fuel:
                exclusion_reason = f"{fuel_type.replace('_', ' ').upper()} out of stock"
            else:
                exclusion_reason = f"No operational pump supports {fuel_type.replace('_', ' ').upper()}"

        evaluated_station = {
            **st,
            "distance_km": distance_km,
            "travel_time_min": travel_time_min,
            "predicted_wait_min": wait_min,
            "total_time_min": total_time_min,
            "has_requested_fuel": has_fuel,
            "has_compatible_pump": has_compatible_pump,
            "eligible": eligible,
            "recommended_pump": rec_pump,
            "score": round(score, 2),
            "rankPenalty": rank_penalty,
            "exclusion_reason": exclusion_reason,
        }
        evaluated_all.append(evaluated_station)

    # Sort by score ascending (lowest total journey time among eligible stations)
    evaluated_all.sort(key=lambda s: (s["score"], s["distance_km"], s["id"]))
    ranked_eligible = [s for s in evaluated_all if s["eligible"]]

    best_station = ranked_eligible[0] if ranked_eligible else None
    fuel_label = fuel_type.replace("_", " ").upper()

    if best_station is not None:
        excluded_notes = [
            f"Station {s['id']} excluded ({s['exclusion_reason']})"
            for s in evaluated_all
            if not s["eligible"]
        ]
        excl_suffix = f" ({'; '.join(excluded_notes)}.)" if excluded_notes else ""
        rationale = (
            f"{best_station['name']} offers the lowest total journey + queue turnaround "
            f"({best_station['total_time_min']} min total = {best_station['travel_time_min']} min synthetic travel "
            f"+ {best_station['predicted_wait_min']} min estimated wait for {vehicle_type.replace('_', ' ')}) "
            f"from {resolved_loc_name} with confirmed {fuel_label} stock on {best_station['recommended_pump']}."
            f"{excl_suffix}"
        )
    else:
        rationale = (
            f"No station currently has both {fuel_label} in stock and an operational compatible pump."
        )

    return {
        "location": resolved_loc_name,
        "location_id": resolved_loc_id,
        "fuel_type": fuel_type,
        "vehicle_type": vehicle_type,
        "best_station_id": best_station["id"] if best_station else None,
        "recommended_station": best_station,
        "ranked_stations": ranked_eligible,
        "all_stations": evaluated_all,
        "rationale": rationale,
        "criteria": {
            "fuel_type": fuel_type,
            "location_id": resolved_loc_id,
            "vehicle_type": vehicle_type,
            "fuel_available_filter": True,
            "compatible_pump_filter": True,
        },
        "disclaimer": PROTOTYPE_DISCLAIMER,
    }
