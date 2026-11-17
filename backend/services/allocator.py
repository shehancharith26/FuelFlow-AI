"""
Pump and Station Allocation Strategies for FuelFlow AI.

Implements:
1. Strategy 1 (Fixed FCFS Baseline):
   - Assigns vehicles to compatible operational pumps using traditional first-come-first-served
     lane selection (shortest raw head-count / cyclic lane entry, with no service-duration
     estimation and no diesel pump reservation).
2. Strategy 2 (FuelFlow Smart Allocation):
   - Evaluates only operational pumps compatible with the vehicle's fuel type at stations
     where that fuel is in stock.
   - Estimates current queue workload using vehicle-type expected service durations
     (strictly avoiding target leakage of actual randomized service durations).
   - Preserves Pump 3 (the only Diesel-capable dispenser) for Diesel vehicles when
     Petrol-only pumps (Pump 1 / Pump 2) have reasonable capacity.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class QueuedWorkItem:
    """Represents an in-progress or queued vehicle on a pump using only observable info."""
    vehicle_id: str
    vehicle_type: str
    fuel_type: str
    arrival_time_min: float
    service_start_min: float
    actual_end_min: float
    estimated_end_min: float
    estimated_service_min: float


@dataclass
class SimPumpState:
    """Mutable state of a single pump during discrete-event simulation."""
    station_id: str
    pump_id: int
    name: str
    fuel_types: List[str]
    status: str  # 'active', 'idle', 'maintenance'
    items: List[QueuedWorkItem] = field(default_factory=list)
    total_busy_min: float = 0.0
    vehicles_served: int = 0

    def is_operational(self) -> bool:
        return self.status != "maintenance"

    def supports_fuel(self, fuel_type: str) -> bool:
        return fuel_type in self.fuel_types

    def is_diesel_capable(self) -> bool:
        return "diesel" in self.fuel_types

    def active_items_at(self, current_time_min: float) -> List[QueuedWorkItem]:
        """Items that have not yet finished actual service at current_time_min."""
        return [item for item in self.items if item.actual_end_min > current_time_min]

    def queue_count_at(self, current_time_min: float) -> int:
        """Number of vehicles currently at the pump (in bay + waiting) at current_time_min."""
        return len(self.active_items_at(current_time_min))

    def estimated_workload_at(self, current_time_min: float) -> float:
        """
        Estimated time (in minutes from current_time_min) until this pump clears its current queue,
        using ONLY observable queue membership and expected service durations (no target leakage).
        """
        active = self.active_items_at(current_time_min)
        if not active:
            return 0.0

        workload = 0.0
        for item in active:
            if item.service_start_min <= current_time_min < item.actual_end_min:
                # Vehicle currently in bay: elapsed time is observable, remaining is estimated
                elapsed = max(0.0, current_time_min - item.service_start_min)
                rem_est = max(0.5, item.estimated_service_min - elapsed)
                workload += rem_est
            else:
                # Vehicle waiting in queue: full estimated service duration
                workload += item.estimated_service_min
        return workload

    def actual_available_time_at(self, current_time_min: float) -> float:
        """True timestamp when the pump becomes free (used by simulator after allocation decision)."""
        if not self.items:
            return current_time_min
        last_end = self.items[-1].actual_end_min
        return max(current_time_min, last_end)


def get_compatible_operational_pumps(
    station_pumps: List[SimPumpState],
    fuel_availability: Dict[str, bool],
    fuel_type: str,
) -> List[SimPumpState]:
    """
    Return all pumps at a station that are operational (not in maintenance)
    and compatible with `fuel_type`, provided the station has `fuel_type` in stock.
    Never returns an offline/maintenance pump or a station without fuel.
    """
    if not fuel_availability.get(fuel_type, False):
        return []
    return [
        p
        for p in station_pumps
        if p.is_operational() and p.supports_fuel(fuel_type)
    ]


def allocate_fcfs_pump(
    station_pumps: List[SimPumpState],
    fuel_availability: Dict[str, bool],
    fuel_type: str,
    current_time_min: float,
    arrival_seq: int = 0,
) -> Tuple[Optional[SimPumpState], str]:
    """
    Strategy 1: Fixed Compatible-Pump FCFS Baseline.
    - Selects among compatible operational pumps without vehicle-type workload estimation
      and without reserving Pump 3 for diesel vehicles.
    - Drivers join the compatible lane with the lowest raw head-count, breaking ties
      cyclically across all compatible pumps (including Pump 3 for petrol).
    """
    compatible = get_compatible_operational_pumps(station_pumps, fuel_availability, fuel_type)
    if not compatible:
        return None, "No compatible operational pump or fuel out of stock"

    # Sort by raw vehicle count at current_time_min; break ties using cyclic rotation
    # that includes Pump 3 so Petrol vehicles frequently enter the multi-fuel bay.
    n = len(compatible)
    scored = []
    for idx, pump in enumerate(compatible):
        q_len = pump.queue_count_at(current_time_min)
        tie_breaker = (idx - (arrival_seq % n)) % n
        scored.append((q_len, tie_breaker, pump))

    scored.sort(key=lambda x: (x[0], x[1]))
    chosen = scored[0][2]
    return chosen, f"Fixed FCFS: joined {chosen.name} by raw head-count ({scored[0][0]} ahead)"


def allocate_smart_pump(
    station_pumps: List[SimPumpState],
    fuel_availability: Dict[str, bool],
    fuel_type: str,
    vehicle_type: str,
    estimated_service_min: float,
    current_time_min: float,
    diesel_preservation_buffer_min: float = 3.5,
) -> Tuple[Optional[SimPumpState], str, float]:
    """
    Strategy 2: FuelFlow Smart Pump Allocation.
    - Evaluates compatible operational pumps using estimated remaining queue workload.
    - Applies a diesel capacity preservation buffer to Pump 3 when allocating non-diesel
      vehicles at a station that stocks diesel and has operational petrol-only pumps.
    - Returns (chosen_pump, rationale_string, estimated_wait_min).
    """
    compatible = get_compatible_operational_pumps(station_pumps, fuel_availability, fuel_type)
    if not compatible:
        return None, "No compatible operational pump or fuel out of stock", 0.0

    station_has_diesel = fuel_availability.get("diesel", False)
    has_Dedicated_petrol_pump = any(not p.is_diesel_capable() for p in compatible)

    best_pump: Optional[SimPumpState] = None
    best_score = float("inf")
    best_raw_workload = 0.0
    diesel_preserved = False

    pump_workloads: Dict[int, float] = {}
    for pump in compatible:
        raw_workload = pump.estimated_workload_at(current_time_min)
        pump_workloads[pump.pump_id] = raw_workload
        score = raw_workload

        # Preserve Pump 3 for diesel vehicles if this is a petrol vehicle and dedicated petrol pumps exist
        if (
            fuel_type != "diesel"
            and station_has_diesel
            and pump.is_diesel_capable()
            and has_Dedicated_petrol_pump
        ):
            score += diesel_preservation_buffer_min

        # Slight preference for grouping fast 2-wheelers/3-wheelers on Pump 1/2 to keep flow high
        if vehicle_type in ("motorcycle", "three_wheeler") and pump.pump_id in (1, 2):
            score -= 0.15

        if score < best_score:
            best_score = score
            best_pump = pump
            best_raw_workload = raw_workload

    assert best_pump is not None

    # Determine rationale message
    if fuel_type == "diesel":
        reason = (
            f"Dedicated diesel capability match on {best_pump.name} "
            f"(est. workload {best_raw_workload:.1f}m)"
        )
    else:
        p3_workload = pump_workloads.get(3)
        if (
            not best_pump.is_diesel_capable()
            and p3_workload is not None
            and p3_workload <= best_raw_workload + 1.0
            and station_has_diesel
        ):
            diesel_preserved = True
            reason = (
                f"{best_pump.name} selected (est. {best_raw_workload:.1f}m); "
                f"reserves Pump 3 for incoming diesel vehicles"
            )
        elif vehicle_type in ("motorcycle", "three_wheeler"):
            reason = (
                f"Fast {estimated_service_min:.1f}m {vehicle_type.replace('_', ' ')} cycle "
                f"routed to lowest-workload bay {best_pump.name} ({best_raw_workload:.1f}m)"
            )
        else:
            reason = (
                f"Workload balanced across compatible bays; {best_pump.name} has "
                f"lowest estimated queue ({best_raw_workload:.1f}m)"
            )

    return best_pump, reason, best_raw_workload
