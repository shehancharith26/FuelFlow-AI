"""
Queue Wait-Time Prediction Service for FuelFlow AI.

Architecture Note for ML Teammate Integration:
- No serialized trained ML model (.pkl / .joblib / .onnx) is present in the repository yet.
- Accordingly, this service explicitly identifies itself as a deterministic queue-workload
  estimation model (`prediction_method="deterministic_queue_workload_estimator"`,
  `is_trained_ml_model=False`).
- An ML teammate can drop in a trained model adapter by subclassing or replacing
  `BaseWaitPredictor` and registering it in `get_predictor()`.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol

from backend.data import VEHICLE_SPECS, get_stations_state


class WaitPredictorProtocol(Protocol):
    """Modular interface for wait-time predictors (deterministic or trained ML)."""

    def predict(
        self,
        station: Dict[str, Any],
        fuel_type: str,
        vehicle_type: str = "car",
        queue_length_override: Optional[int] = None,
        active_compatible_pumps_override: Optional[int] = None,
        estimated_service_min_override: Optional[float] = None,
        workload_min_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        ...


class DeterministicWorkloadPredictor:
    """
    Deterministic Queue-Workload Estimator (Non-ML).
    Computes expected wait time from:
      - Fuel stock availability at the station
      - Compatible operational pumps (status != 'maintenance' and fuel_type in pump.fuel_types)
      - Per-pump queue counts, current bay remaining time, and vehicle service duration
      - Diesel preservation preference (favoring Pump 1/2 for Petrol when Pump 3 supports Diesel)
    """

    MODEL_VERSION = "Deterministic-WorkloadEstimator-v1.0 (Non-ML)"
    PREDICTION_METHOD = "deterministic_queue_workload_estimator"

    def predict(
        self,
        station: Dict[str, Any],
        fuel_type: str,
        vehicle_type: str = "car",
        queue_length_override: Optional[int] = None,
        active_compatible_pumps_override: Optional[int] = None,
        estimated_service_min_override: Optional[float] = None,
        workload_min_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        station_id = str(station["id"])
        fuel_avail = station.get("fuel_availability", {})
        has_fuel = bool(fuel_avail.get(fuel_type, False))

        v_spec = VEHICLE_SPECS.get(vehicle_type, VEHICLE_SPECS["car"])
        unit_service_min = (
            float(estimated_service_min_override)
            if estimated_service_min_override is not None
            else float(v_spec["avg_service_min"])
        )

        pumps: List[Dict[str, Any]] = station.get("pumps", [])
        compatible_pumps = [
            p
            for p in pumps
            if p.get("status") != "maintenance" and fuel_type in p.get("fuel_types", [])
        ]
        compatible_ids = [int(p["id"]) for p in compatible_pumps]

        active_comp_count = (
            int(active_compatible_pumps_override)
            if active_compatible_pumps_override is not None
            else len(compatible_pumps)
        )

        # Check eligibility: requires both fuel in stock AND at least one operational compatible pump
        if not has_fuel or active_comp_count <= 0 or not compatible_pumps:
            reason = (
                f"{fuel_type.replace('_', ' ').upper()} is out of stock at Station {station_id}."
                if not has_fuel
                else f"No operational compatible pump available for {fuel_type.replace('_', ' ').upper()} at Station {station_id}."
            )
            return {
                "station_id": station_id,
                "fuel_type": fuel_type,
                "vehicle_type": vehicle_type,
                "predicted_wait_min": 999.0,
                "recommended_pump": None,
                "recommended_pump_id": None,
                "prediction_method": self.PREDICTION_METHOD,
                "is_trained_ml_model": False,
                "model_version": self.MODEL_VERSION,
                "confidence_score": 1.0,
                "eligible": False,
                "status_note": reason,
                "breakdown": {
                    "active_pumps": 0,
                    "vehicle_queue": int(queue_length_override or station.get("queue_length", 0)),
                    "unit_service_time": round(unit_service_min, 2),
                    "workload_min": 0.0,
                    "compatible_pump_ids": [],
                },
            }

        # Select best compatible operational pump and estimate wait time
        station_has_diesel = bool(fuel_avail.get("diesel", False))
        has_dedicated_petrol = any("diesel" not in p.get("fuel_types", []) for p in compatible_pumps)

        best_pump: Optional[Dict[str, Any]] = None
        best_pump_score = float("inf")
        best_pump_wait = 0.0

        for p in compatible_pumps:
            q_cnt = int(p.get("queue_count", 0))
            curr_veh = p.get("current_vehicle")
            in_bay_min = (float(curr_veh["remaining_sec"]) / 60.0) if curr_veh else 0.0
            pump_wait = in_bay_min + q_cnt * (unit_service_min * 0.85)
            score = pump_wait

            # Preserve Pump 3 for diesel when evaluating petrol vehicles
            if (
                fuel_type != "diesel"
                and station_has_diesel
                and "diesel" in p.get("fuel_types", [])
                and has_dedicated_petrol
            ):
                score += 2.5

            if score < best_pump_score:
                best_pump_score = score
                best_pump = p
                best_pump_wait = pump_wait

        assert best_pump is not None

        # If caller supplied explicit queue_length / active_compatible_pumps overrides,
        # compute deterministic queue workload formula from those parameters
        if queue_length_override is not None or workload_min_override is not None:
            q_len = int(
                queue_length_override
                if queue_length_override is not None
                else sum(int(p.get("queue_count", 0)) for p in compatible_pumps)
            )
            if workload_min_override is not None and queue_length_override is None:
                total_workload = float(workload_min_override)
            else:
                total_workload = q_len * unit_service_min
            predicted_wait = round(max(1.0, total_workload / max(1, active_comp_count)), 1)
        else:
            q_len = sum(int(p.get("queue_count", 0)) for p in compatible_pumps)
            total_workload = round(q_len * unit_service_min, 1)
            predicted_wait = round(max(1.5, best_pump_wait), 1)

        return {
            "station_id": station_id,
            "fuel_type": fuel_type,
            "vehicle_type": vehicle_type,
            "predicted_wait_min": predicted_wait,
            "recommended_pump": str(best_pump["name"]),
            "recommended_pump_id": int(best_pump["id"]),
            "prediction_method": self.PREDICTION_METHOD,
            "is_trained_ml_model": False,
            "model_version": self.MODEL_VERSION,
            "confidence_score": 0.92,
            "eligible": True,
            "status_note": (
                f"Deterministic queue workload estimate on {best_pump['name']} "
                f"({len(compatible_pumps)} compatible operational pump(s))."
            ),
            "breakdown": {
                "active_pumps": active_comp_count,
                "vehicle_queue": q_len,
                "unit_service_time": round(unit_service_min, 2),
                "workload_min": round(total_workload, 1),
                "compatible_pump_ids": compatible_ids,
            },
        }


_PREDICTOR_INSTANCE: WaitPredictorProtocol = DeterministicWorkloadPredictor()


def get_predictor() -> WaitPredictorProtocol:
    """Return the active wait-time predictor instance."""
    return _PREDICTOR_INSTANCE


def predict_wait_time_service(
    station_id: str = "A",
    fuel_type: str = "petrol_92",
    vehicle_type: str = "car",
    queue_length: Optional[int] = None,
    active_compatible_pumps: Optional[int] = None,
    estimated_service_min: Optional[float] = None,
    workload_min: Optional[float] = None,
    stations_override: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Service entry point for `POST /predict`."""
    stations = stations_override if stations_override is not None else get_stations_state()
    target = next((s for s in stations if s["id"] == station_id), None)
    if target is None:
        raise ValueError(f"Unknown station_id: {station_id}")

    predictor = get_predictor()
    return predictor.predict(
        station=target,
        fuel_type=fuel_type,
        vehicle_type=vehicle_type,
        queue_length_override=queue_length,
        active_compatible_pumps_override=active_compatible_pumps,
        estimated_service_min_override=estimated_service_min,
        workload_min_override=workload_min,
    )
