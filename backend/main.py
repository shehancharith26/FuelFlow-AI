"""
FuelFlow AI - FastAPI Backend Application
Intelligent Fuel Station Discovery, Queue Wait Prediction & Smart Pump Allocation.
"""

from pathlib import Path
import sys
from typing import List

# Allow running both from repository root (`uvicorn backend.main:app`) and from `backend/` (`uvicorn main:app`)
_ROOT_DIR = Path(__file__).resolve().parent.parent
if str(_ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(_ROOT_DIR))

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from backend.data import (
    PROTOTYPE_DISCLAIMER,
    get_stations_state,
    update_stations_from_simulation,
)
from backend.schemas import (
    CompareRequest,
    CompareResponse,
    HealthResponse,
    PredictRequest,
    PredictResponse,
    RecommendRequest,
    RecommendResponse,
    SimulateRequest,
    SimulateResponse,
    StationSchema,
)
from backend.services.predictor import predict_wait_time_service
from backend.services.recommender import recommend_station_service
from backend.services.simulator import compare_strategies_service, run_simulation_service

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
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
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
    Predict waiting time at a specific station using the modular deterministic queue-workload
    estimator (explicitly labeled as a deterministic non-ML estimator until a trained model is integrated).
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
    Updates in-memory station queue metrics from the simulated run when `vehicle_count > 0`.
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
    computing all percentage improvements dynamically.
    """
    result = compare_strategies_service(
        vehicle_count=payload.vehicle_count,
        seed=payload.seed,
        scenario=payload.scenario,
        horizon_min=payload.horizon_min,
    )
    return CompareResponse(**result)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
