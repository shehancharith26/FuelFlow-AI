"""
FuelFlow AI - FastAPI Backend Application
Intelligent Fuel Station Discovery, Queue Wait Prediction & Smart Pump Allocation.
"""

import os
from pathlib import Path
import secrets
import sys
from typing import Any, Dict, List, Optional

# Allow running both from repository root (`uvicorn backend.main:app`) and from `backend/` (`uvicorn main:app`)
_ROOT_DIR = Path(__file__).resolve().parent.parent
if str(_ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(_ROOT_DIR))

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from backend.data import (
    PROTOTYPE_DISCLAIMER,
    VEHICLE_SPECS,
    get_stations_state,
    update_stations_from_simulation,
)
from backend.database import (
    DuplicateActiveRegistrationError,
    InvalidStatusTransitionError,
    RegistrationNotFoundError,
    create_queue_registration,
    get_active_registration_by_vehicle,
    get_queue_registration_by_id,
    get_recent_summaries,
    init_db,
    list_queue_registrations,
    save_compare_summary,
    save_simulation_summary,
    update_queue_status,
)
from backend.schemas import (
    CompareRequest,
    CompareResponse,
    HealthResponse,
    PredictRequest,
    PredictResponse,
    QueueJoinRequest,
    QueueJoinResponse,
    QueueRegistrationSchema,
    QueueStatusUpdateRequest,
    RecommendRequest,
    RecommendResponse,
    SimulateRequest,
    SimulateResponse,
    StationSchema,
)
from backend.services.predictor import predict_wait_time_service
from backend.services.recommender import recommend_station_service
from backend.services.simulator import compare_strategies_service, run_simulation_service

# Initialize SQLite database on module load
init_db()

app = FastAPI(
    title="FuelFlow AI Backend API",
    description=(
        "Intelligent Fuel Station Queue Prediction & Smart Pump Allocation Prototype API "
        "(BuildX 0.1 Hackathon — Fictional Kegalle Scenario)."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check & System Status",
    tags=["System"],
)
def get_health() -> HealthResponse:
    """Return service health status and prototype simulation disclaimer."""
    stations = get_stations_state()
    total_pumps = sum(len(s.get("pumps", [])) for s in stations)
    return HealthResponse(
        status="ok",
        service="FuelFlow AI Backend",
        version="1.0.0",
        mode="simulation_prototype",
        disclaimer=PROTOTYPE_DISCLAIMER,
        stations_count=len(stations),
        pumps_total=total_pumps,
    )


@app.get(
    "/stations",
    response_model=List[StationSchema],
    summary="List Prototype Fuel Stations & Pump Telemetry",
    tags=["Stations"],
)
def get_stations() -> List[StationSchema]:
    """
    Return the 3 fictional Kegalle prototype fuel stations (Station A, Station B, Station C)
    with their 3 pumps each, fuel availability, queue counts, and predicted wait times.
    """
    stations = get_stations_state()
    return [StationSchema(**st) for st in stations]


@app.post(
    "/recommend",
    response_model=RecommendResponse,
    summary="Recommend Optimal Fuel Station for Driver",
    tags=["Driver Portal"],
)
def post_recommend(payload: RecommendRequest) -> RecommendResponse:
    """
    Evaluate stations for a driver's departure location, required fuel type, and vehicle type.
    Only stations with the requested fuel in stock and at least one compatible operational pump
    are eligible for recommendation. Ranked by minimum `travel_time_min + predicted_wait_min`.
    """
    result = recommend_station_service(
        location=payload.location,
        fuel_type=payload.fuel_type,
        location_id=payload.location_id,
        vehicle_type=payload.vehicle_type,
    )
    return RecommendResponse(**result)


@app.post(
    "/predict",
    response_model=PredictResponse,
    summary="Predict Queue Waiting Time & Best Compatible Pump",
    tags=["Driver Portal"],
)
def post_predict(payload: PredictRequest) -> PredictResponse:
    """
    Predict waiting time at a specific station using the trained RandomForestRegressor ML model
    (trained on synthetic queue simulation data, with deterministic queue-workload fallback).
    """
    try:
        result = predict_wait_time_service(
            station_id=payload.station_id,
            fuel_type=payload.fuel_type,
            vehicle_type=payload.vehicle_type,
            queue_length=payload.queue_length,
            active_compatible_pumps=payload.active_compatible_pumps,
            estimated_service_min=payload.estimated_service_min,
            workload_min=payload.workload_min,
        )
        return PredictResponse(**result)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@app.post(
    "/simulate",
    response_model=SimulateResponse,
    summary="Run Seeded Discrete-Event Queue Simulation",
    tags=["Manager Portal & Simulation"],
)
def post_simulate(payload: SimulateRequest) -> SimulateResponse:
    """
    Execute a reproducible discrete-event simulation across all 3 stations and 9 pumps.
    Updates in-memory station queue metrics and stores execution summary in SQLite database.
    """
    result = run_simulation_service(
        vehicle_count=payload.vehicle_count,
        scenario=payload.scenario,
        seed=payload.seed,
        strategy=payload.strategy,
        horizon_min=payload.horizon_min,
    )
    if payload.vehicle_count > 0 and "station_metrics" in result.get("results", {}):
        update_stations_from_simulation(result["results"]["station_metrics"])

    # Persist simulation run summary into SQLite database
    try:
        save_simulation_summary(result)
    except Exception as exc:
        # Gracefully log without breaking simulation response
        import logging

        logging.getLogger("fuelflow.main").error("Failed to save simulation to SQLite: %s", exc)

    return SimulateResponse(**result)


@app.post(
    "/compare",
    response_model=CompareResponse,
    summary="Compare Fixed FCFS vs FuelFlow Smart Pump Allocation",
    tags=["Manager Portal & Simulation"],
)
def post_compare(payload: CompareRequest) -> CompareResponse:
    """
    Run a paired discrete-event simulation comparing Strategy 1 (Fixed Compatible-Pump FCFS)
    against Strategy 2 (FuelFlow Smart Allocation) on the exact same seeded vehicle arrivals,
    computing all percentage improvements dynamically and storing summary in SQLite database.
    """
    result = compare_strategies_service(
        vehicle_count=payload.vehicle_count,
        seed=payload.seed,
        scenario=payload.scenario,
        horizon_min=payload.horizon_min,
    )

    # Persist comparison summary into SQLite database
    try:
        save_compare_summary(result)
    except Exception as exc:
        import logging

        logging.getLogger("fuelflow.main").error("Failed to save comparison to SQLite: %s", exc)

    return CompareResponse(**result)


@app.get(
    "/simulations/history",
    summary="Get Recent Simulation Summaries from SQLite Database",
    tags=["Manager Portal & Simulation"],
)
def get_simulation_history(
    limit: int = Query(default=20, ge=1, le=100),
    run_type: str = Query(default=None, description="'simulate' or 'compare'"),
) -> List[Dict[str, Any]]:
    """Retrieve history of saved simulation and strategy comparison summaries from SQLite."""
    return get_recent_summaries(limit=limit, run_type=run_type)


# -----------------------------------------------------------------------------
# Virtual Queue System Endpoints (v1.1 Portfolio Edition)
# -----------------------------------------------------------------------------

def verify_manager_auth(
    x_manager_key: Optional[str] = Header(None, alias="X-Manager-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    """
    Authenticate privileged station management actions.
    Security Architecture:
      - Reads MANAGER_API_KEY exclusively from the server environment variable.
      - Never uses hardcoded or fallback keys in code.
      - Fails closed with HTTP 503 if MANAGER_API_KEY is unset or empty.
      - Requires either 'X-Manager-Key: <key>' or 'Authorization: Bearer <key>'.
      - Uses constant-time comparison (secrets.compare_digest) to prevent timing attacks.
    """
    expected_key = (os.environ.get("MANAGER_API_KEY") or "").strip()
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Manager operations are disabled: server environment variable 'MANAGER_API_KEY' is not configured.",
        )

    provided_key: Optional[str] = None
    if x_manager_key:
        provided_key = x_manager_key.strip()
    elif authorization and authorization.startswith("Bearer "):
        provided_key = authorization[7:].strip()

    if not provided_key or not secrets.compare_digest(provided_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Valid manager credentials required (provide 'X-Manager-Key' header or Bearer token).",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return provided_key


@app.post(
    "/queue/join",
    response_model=QueueJoinResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Join Prototype Driver Virtual Queue",
    tags=["Virtual Queue"],
)
def post_join_virtual_queue(payload: QueueJoinRequest) -> QueueJoinResponse:
    """
    Validate submitted driver details, verify fuel availability & operational pumps,
    prevent duplicate active registrations at both application and SQLite constraint levels,
    estimate waiting time using the existing RandomForest ML model, and persist to SQLite.
    """
    # 1. Verify target station existence
    stations = get_stations_state()
    target_station = next((s for s in stations if s["id"] == payload.station_id), None)
    if not target_station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Station '{payload.station_id}' is not recognized in the Kegalle prototype corridor.",
        )

    # 2. Verify fuel availability at target station
    fuel_avail = target_station.get("fuel_availability", {})
    if not fuel_avail.get(payload.fuel_type, False):
        fuel_label = payload.fuel_type.replace("_", " ").upper()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fuel type {fuel_label} is currently out of stock / depleted at {target_station['name']}.",
        )

    # 3. Verify at least one operational compatible pump is active
    compatible_pumps = [
        p
        for p in target_station.get("pumps", [])
        if p.get("status") != "maintenance" and payload.fuel_type in p.get("fuel_types", [])
    ]
    if not compatible_pumps:
        fuel_label = payload.fuel_type.replace("_", " ").upper()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No operational dispenser currently supports {fuel_label} at {target_station['name']} (pumps in maintenance).",
        )

    # 4. Determine current virtual queue depth for this station and fuel type
    current_waiting = list_queue_registrations(
        station_id=payload.station_id,
        fuel_type=payload.fuel_type,
        status="WAITING",
    )
    new_position = len(current_waiting) + 1

    # 5. Predict queue waiting time using the existing RandomForest ML model
    v_spec = VEHICLE_SPECS.get(payload.vehicle_type, VEHICLE_SPECS["car"])
    unit_service_min = float(v_spec["avg_service_min"])
    workload_min = new_position * unit_service_min

    ml_result = predict_wait_time_service(
        station_id=payload.station_id,
        fuel_type=payload.fuel_type,
        vehicle_type=payload.vehicle_type,
        queue_length=new_position,
        active_compatible_pumps=len(compatible_pumps),
        estimated_service_min=unit_service_min,
        workload_min=workload_min,
    )
    predicted_wait = float(ml_result.get("predicted_wait_min", 6.0))
    assigned_pump_id = ml_result.get("recommended_pump_id")
    assigned_pump_name = ml_result.get("recommended_pump")

    # 6. Persist to SQLite with transactional integrity & active duplicate prevention
    try:
        created = create_queue_registration(
            vehicle_number=payload.vehicle_number,
            vehicle_type=payload.vehicle_type,
            fuel_type=payload.fuel_type,
            fuel_quantity_litres=payload.fuel_quantity_litres,
            station_id=payload.station_id,
            estimated_wait_min=predicted_wait,
            assigned_pump_id=assigned_pump_id,
        )
    except DuplicateActiveRegistrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while creating virtual queue registration: {exc}",
        ) from exc

    return QueueJoinResponse(
        registration_id=created["registration_id"],
        vehicle_number=created["vehicle_number"],
        vehicle_type=created["vehicle_type"],
        fuel_type=created["fuel_type"],
        fuel_quantity_litres=created["fuel_quantity_litres"],
        station_id=created["station_id"],
        station_name=target_station["name"],
        queue_position=created["queue_position"],
        estimated_wait_min=created["estimated_wait_min"],
        assigned_pump_id=assigned_pump_id,
        assigned_pump_name=assigned_pump_name,
        status=created["status"],
        created_at=created["created_at"],
        updated_at=created["updated_at"],
        disclaimer=created["disclaimer"],
    )


@app.get(
    "/queue/registrations",
    response_model=List[QueueRegistrationSchema],
    summary="List Virtual Queue Registrations",
    tags=["Virtual Queue"],
)
def get_queue_registrations(
    station_id: Optional[str] = Query(default=None, description="Filter by station ('A', 'B', or 'C')"),
    status: Optional[str] = Query(default=None, description="Filter by status ('WAITING', 'SERVING', 'COMPLETED', 'CANCELLED')"),
    fuel_type: Optional[str] = Query(default=None, description="Filter by fuel type"),
    limit: int = Query(default=50, ge=1, le=500, description="Max registrations to return"),
) -> List[QueueRegistrationSchema]:
    """Retrieve virtual queue registrations with optional filters for station, status, or fuel type."""
    rows = list_queue_registrations(
        station_id=station_id,
        status=status,
        fuel_type=fuel_type,
        limit=limit,
    )
    return [QueueRegistrationSchema(**r) for r in rows]


@app.patch(
    "/queue/registrations/{registration_id}/status",
    response_model=QueueRegistrationSchema,
    summary="Update Queue Registration Status (Manager Protected)",
    tags=["Virtual Queue"],
)
def patch_queue_status(
    registration_id: str,
    payload: QueueStatusUpdateRequest,
    _auth: str = Depends(verify_manager_auth),
) -> QueueRegistrationSchema:
    """
    Update a virtual queue registration's status following strict lifecycle rules:
      - WAITING -> SERVING -> COMPLETED
      - WAITING -> CANCELLED
    Automatically recalculates active queue positions for remaining waiting vehicles.
    Protected by manager authentication.
    """
    try:
        updated = update_queue_status(
            registration_id=registration_id,
            new_status=payload.status,
        )
        return QueueRegistrationSchema(**updated)
    except RegistrationNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except InvalidStatusTransitionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@app.get(
    "/queue/status/{lookup_key}",
    response_model=QueueRegistrationSchema,
    summary="Get Active Virtual Queue Ticket by ID or Vehicle Plate",
    tags=["Virtual Queue"],
)
def get_queue_status(lookup_key: str) -> QueueRegistrationSchema:
    """
    Check the current queue status and updated position of a ticket.
    Accepts either a registration ID (e.g. 'VQ-20261119-A1B2C3') or vehicle plate (e.g. 'WP-CAB-4012').
    """
    clean_key = lookup_key.strip().upper()
    # 1. Try lookup by registration ID
    reg = get_queue_registration_by_id(clean_key)
    if reg:
        return QueueRegistrationSchema(**reg)

    # 2. Try lookup by vehicle plate
    active_reg = get_active_registration_by_vehicle(clean_key)
    if active_reg:
        return QueueRegistrationSchema(**active_reg)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No active queue registration found for identifier '{clean_key}'.",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
