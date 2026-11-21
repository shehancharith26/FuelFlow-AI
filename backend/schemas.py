"""
Pydantic v2 request and response schemas for the FuelFlow AI backend.
Matches the exact contracts expected by the React frontend (frontend/src/services/api.js).
"""

import re
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator

FuelType = Literal["petrol_92", "petrol_95", "diesel"]
VehicleType = Literal["car", "motorcycle", "three_wheeler", "van", "lorry"]
PumpStatus = Literal["active", "maintenance", "idle"]
ScenarioType = Literal["normal", "peak"]
QueueStatus = Literal["WAITING", "SERVING", "COMPLETED", "CANCELLED"]


class CurrentVehicle(BaseModel):
    id: str = Field(..., description="Synthetic vehicle registration plate")
    type: VehicleType = Field(..., description="Vehicle category")
    fuel: FuelType = Field(..., description="Fuel type being dispensed")
    remaining_sec: int = Field(..., ge=0, description="Estimated remaining service time in seconds")


class PumpSchema(BaseModel):
    id: int = Field(..., ge=1, le=3, description="Pump number within the station (1..3)")
    name: str = Field(..., description="Display name, e.g. 'Pump 1'")
    fuel_types: List[FuelType] = Field(..., description="Supported fuel types on this dispenser")
    status: PumpStatus = Field(..., description="Operational status of the pump")
    current_vehicle: Optional[CurrentVehicle] = Field(
        None, description="Vehicle currently being served in the bay, if active"
    )
    queue_count: int = Field(..., ge=0, description="Number of vehicles queued at this pump")
    utilization: float = Field(..., ge=0, le=100, description="Pump utilization percentage (0-100)")
    flow_rate_lpm: float = Field(..., ge=0, description="Dispenser flow rate in liters per minute")


class FuelAvailability(BaseModel):
    petrol_92: bool
    petrol_95: bool
    diesel: bool


class StationSchema(BaseModel):
    id: str = Field(..., description="Station identifier ('A', 'B', or 'C')")
    name: str = Field(..., description="Full prototype station name")
    short_name: str = Field(..., description="Short station label")
    location_label: str = Field(..., description="Fictional Kegalle corridor address label")
    distance_km: float = Field(..., ge=0, description="Simulated driving distance in km")
    travel_time_min: float = Field(..., ge=0, description="Simulated driving time in minutes")
    fuel_availability: FuelAvailability
    queue_length: int = Field(..., ge=0, description="Total vehicles queued across active pumps")
    predicted_wait_min: float = Field(..., ge=0, description="Estimated queue waiting time in minutes")
    total_vehicles_served: int = Field(0, ge=0, description="Total vehicles served in current/last cycle")
    pumps: List[PumpSchema]


class EvaluatedStationSchema(StationSchema):
    total_time_min: float = Field(..., ge=0, description="travel_time_min + predicted_wait_min")
    has_requested_fuel: bool = Field(..., description="Whether requested fuel is in stock at station")
    has_compatible_pump: bool = Field(
        ..., description="Whether at least one non-maintenance pump supports the requested fuel"
    )
    eligible: bool = Field(..., description="True only if both fuel is available and a compatible pump is operational")
    recommended_pump: Optional[str] = Field(None, description="Best compatible operational pump at this station")
    score: float = Field(..., description="Ranking score (lower is better; ineligible stations receive penalty)")
    rankPenalty: int = Field(0, description="Penalty applied when station cannot serve the request")
    exclusion_reason: Optional[str] = Field(None, description="Reason if station is ineligible")


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "FuelFlow AI Backend"
    version: str = "1.0.0"
    mode: str = "simulation_prototype"
    disclaimer: str = (
        "PROTOTYPE — SIMULATED DATA. Fictional Kegalle stations, synthetic distances, "
        "and deterministic queue workload predictions."
    )
    stations_count: int = 3
    pumps_total: int = 9


class RecommendRequest(BaseModel):
    location: str = Field(
        default="Kegalle",
        min_length=1,
        description="Driver departure location name or ID in the Kegalle prototype corridor",
    )
    fuel_type: FuelType = Field(default="petrol_92", description="Required fuel type")
    location_id: Optional[str] = Field(
        default=None, description="Optional explicit location ID (e.g. 'kegalle_clock_tower')"
    )
    vehicle_type: VehicleType = Field(
        default="car", description="Optional vehicle type for service time calibration"
    )


class RecommendCriteria(BaseModel):
    fuel_type: FuelType
    location_id: str
    vehicle_type: VehicleType
    fuel_available_filter: bool = True
    compatible_pump_filter: bool = True


class RecommendResponse(BaseModel):
    location: str
    location_id: str
    fuel_type: FuelType
    vehicle_type: VehicleType
    best_station_id: Optional[str]
    recommended_station: Optional[EvaluatedStationSchema]
    ranked_stations: List[EvaluatedStationSchema] = Field(
        ..., description="Eligible stations only (fuel available + operational compatible pump), ordered best first"
    )
    all_stations: List[EvaluatedStationSchema] = Field(
        ..., description="All 3 stations ordered by score for complete UI matrix display"
    )
    rationale: str
    criteria: RecommendCriteria
    disclaimer: str = "Simulated distances, travel times, and queue predictions for Kegalle prototype scenario."


class PredictRequest(BaseModel):
    station_id: Literal["A", "B", "C"] = Field(default="A", description="Target station ID ('A', 'B', or 'C')")
    fuel_type: FuelType = Field(default="petrol_92", description="Required fuel type")
    vehicle_type: VehicleType = Field(default="car", description="Vehicle category")
    queue_length: Optional[int] = Field(
        default=None, ge=0, le=500, description="Number of vehicles ahead in compatible queue"
    )
    active_compatible_pumps: Optional[int] = Field(
        default=None, ge=0, le=3, description="Number of active compatible pumps at the station"
    )
    estimated_service_min: Optional[float] = Field(
        default=None, gt=0, le=60, description="Estimated service duration per vehicle in minutes"
    )
    workload_min: Optional[float] = Field(
        default=None, ge=0, le=5000, description="Optional explicit existing queue workload in minutes"
    )


class PredictBreakdown(BaseModel):
    active_pumps: int
    vehicle_queue: int
    unit_service_time: float
    workload_min: float
    compatible_pump_ids: List[int]


class PredictResponse(BaseModel):
    station_id: str
    fuel_type: FuelType
    vehicle_type: VehicleType
    predicted_wait_min: float
    recommended_pump: Optional[str]
    recommended_pump_id: Optional[int]
    prediction_method: str = "deterministic_queue_workload_estimator"
    is_trained_ml_model: bool = False
    model_version: str = "Deterministic-WorkloadEstimator-v1.0 (Non-ML)"
    confidence_score: float = Field(..., ge=0, le=1)
    eligible: bool
    status_note: str
    breakdown: PredictBreakdown


class SimulateRequest(BaseModel):
    vehicle_count: int = Field(default=200, ge=0, le=2000, description="Total vehicles to simulate")
    scenario: ScenarioType = Field(default="normal", description="Traffic inflow scenario ('normal' or 'peak')")
    seed: int = Field(default=42, description="Random seed for reproducible discrete-event simulation")
    strategy: Literal["smart", "fcfs"] = Field(
        default="smart", description="Pump allocation strategy to execute"
    )
    horizon_min: float = Field(default=60.0, gt=0, le=480.0, description="Simulation arrival horizon in minutes")


class StationSimulationMetrics(BaseModel):
    vehicles_arrived: int
    vehicles_served: int
    avg_wait_min: float
    max_wait_min: float
    queue_length: int
    active_pumps: int
    pump_utilization: Dict[int, float]


class SimulationResults(BaseModel):
    total_vehicles_simulated: int
    vehicles_served: int
    vehicles_in_queue_at_end: int
    unserved_incompatible_or_no_fuel: int
    active_pumps_total: int
    system_avg_wait_min: float
    system_max_wait_min: float
    throughput_per_hr: float
    station_metrics: Dict[str, StationSimulationMetrics]


class AllocationLogEntry(BaseModel):
    id: str
    vehicle_id: str
    vehicle_type: VehicleType
    fuel: FuelType
    assigned_station: str
    assigned_pump: str
    reason: str
    saved_wait_min: float
    timestamp: str


class SimulateResponse(BaseModel):
    scenario: ScenarioType
    vehicle_count: int
    seed: int
    horizon_min: float
    strategy: str
    disclaimer: str = "Synthetic discrete-event queue simulation on Kegalle prototype stations."
    results: SimulationResults
    allocation_log: List[AllocationLogEntry]


class CompareRequest(BaseModel):
    vehicle_count: int = Field(default=200, ge=0, le=2000, description="Total vehicles to simulate across both strategies")
    seed: int = Field(default=42, description="Random seed ensuring identical vehicle arrivals for both strategies")
    scenario: ScenarioType = Field(default="normal", description="Traffic inflow scenario ('normal' or 'peak')")
    horizon_min: float = Field(default=60.0, gt=0, le=480.0, description="Simulation arrival horizon in minutes")


class StrategyMetrics(BaseModel):
    avg_wait_min: float
    max_wait_min: float
    throughput_per_hr: float
    vehicles_served: int
    bottleneck_events: int
    pump_idle_time_pct: float


class ImprovementMetrics(BaseModel):
    wait_reduction_pct: float
    max_wait_reduction_pct: float
    throughput_gain_pct: float
    efficiency_score: int


class OverallComparison(BaseModel):
    total_vehicles: int
    fixed_fcfs: StrategyMetrics
    smart_allocation: StrategyMetrics
    improvement: ImprovementMetrics


class StationBreakdownItem(BaseModel):
    station_id: str
    name: str
    fixed_avg_wait: float
    smart_avg_wait: float
    fixed_max_wait: float
    smart_max_wait: float
    fixed_throughput: float
    smart_throughput: float
    vehicles_allocated: int


class TimelinePoint(BaseModel):
    time: str
    fcfs_wait: float
    smart_wait: float
    throughput_fcfs: int
    throughput_smart: int


class PumpUtilizationItem(BaseModel):
    name: str
    fcfs_util: float
    smart_util: float
    balance: str


class CompareResponse(BaseModel):
    seed: int
    scenario: ScenarioType
    horizon_min: float
    disclaimer: str = (
        "Paired discrete-event simulation comparing Fixed Compatible-Pump FCFS vs "
        "FuelFlow Smart Allocation on identical vehicle arrivals."
    )
    overall: OverallComparison
    station_breakdown: List[StationBreakdownItem]
    timeline_chart: List[TimelinePoint]
    pump_utilization_chart: List[PumpUtilizationItem]
    allocation_log: List[AllocationLogEntry]


# -----------------------------------------------------------------------------
# Virtual Queue Schemas (v1.1 Portfolio Edition)
# -----------------------------------------------------------------------------

class QueueJoinRequest(BaseModel):
    vehicle_number: str = Field(
        ...,
        min_length=3,
        max_length=20,
        description="Vehicle registration plate number (e.g. 'WP-CAB-4012')",
        examples=["WP-CAB-4012"],
    )
    vehicle_type: VehicleType = Field(
        default="car",
        description="Vehicle category for service-time calibration",
    )
    fuel_type: FuelType = Field(
        default="petrol_92",
        description="Required fuel type",
    )
    fuel_quantity_litres: float = Field(
        ...,
        gt=0.0,
        le=200.0,
        description="Required fuel quantity in litres (0.1 to 200.0 L)",
        examples=[30.0],
    )
    station_id: Literal["A", "B", "C"] = Field(
        ...,
        description="Target prototype station ID ('A', 'B', or 'C')",
        examples=["A"],
    )

    @field_validator("vehicle_number")
    @classmethod
    def validate_vehicle_plate(cls, v: str) -> str:
        clean = v.strip().upper()
        if not re.match(r"^[A-Z0-9\-\s]{3,20}$", clean):
            raise ValueError(
                "Vehicle registration plate must contain only letters, numbers, hyphens, and spaces."
            )
        has_letter = any(c.isalpha() for c in clean)
        has_digit = any(c.isdigit() for c in clean)
        if not (has_letter and has_digit):
            raise ValueError(
                "Vehicle registration plate must contain both letters and digits (e.g. 'WP-CAB-4012')."
            )
        return clean


class QueueJoinResponse(BaseModel):
    registration_id: str
    vehicle_number: str
    vehicle_type: VehicleType
    fuel_type: FuelType
    fuel_quantity_litres: float
    station_id: str
    station_name: str
    queue_position: int
    estimated_wait_min: float
    assigned_pump_id: Optional[int]
    assigned_pump_name: Optional[str]
    status: QueueStatus
    created_at: str
    updated_at: str
    disclaimer: str


class QueueStatusUpdateRequest(BaseModel):
    status: QueueStatus = Field(
        ...,
        description="Target queue status. Strict transitions: WAITING -> SERVING, WAITING -> CANCELLED, SERVING -> COMPLETED.",
    )


class QueueRegistrationSchema(BaseModel):
    id: int
    registration_id: str
    vehicle_number: str
    vehicle_type: VehicleType
    fuel_type: FuelType
    fuel_quantity_litres: float
    station_id: str
    queue_position: int
    estimated_wait_min: float
    status: QueueStatus
    assigned_pump_id: Optional[int]
    created_at: str
    updated_at: str
    is_simulated: bool
    disclaimer: str
