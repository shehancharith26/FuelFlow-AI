# FuelFlow AI — FastAPI Backend (`feature/backend`)

> **PROTOTYPE — SIMULATED DATA**: All stations, distances, travel times, fuel inventories, and pump queues are synthetic representations of a fictional Kegalle corridor scenario for the **BuildX 0.1 Hackathon**.

## Overview

This directory contains the Python FastAPI backend for **FuelFlow AI**, providing:
1. **Seeded Discrete-Event Queue Simulation (`backend/services/simulator.py`)**: Models 200 (configurable `0..2000`) arriving vehicles across 3 stations (`A`, `B`, `C`) and 9 pumps over a 60-minute horizon under `normal` and `peak` traffic scenarios.
2. **Smart Pump & Corridor Allocation (`backend/services/allocator.py`)**: Compares **Strategy 1 (Fixed Compatible-Pump FCFS)** against **Strategy 2 (FuelFlow Smart Allocation)** on the exact same generated vehicle arrivals without target leakage, preserving Pump 3 capacity for Diesel vehicles and balancing queue workloads.
3. **Modular Queue Wait-Time Predictor (`backend/services/predictor.py`)**: Explicitly identifies as a deterministic queue-workload estimator (`deterministic_queue_workload_estimator`, `is_trained_ml_model=False`) with a clean protocol interface (`WaitPredictorProtocol`) so the ML teammate can plug in a trained regression model.
4. **Multi-Objective Station Recommender (`backend/services/recommender.py`)**: Filters strictly for stations with requested fuel in stock and an operational compatible pump, ranking by minimum `travel_time_min + predicted_wait_min`.

---

## Directory Structure

```text
backend/
├── __init__.py
├── main.py                  # FastAPI entry point, CORS config, & routes
├── schemas.py               # Pydantic v2 request/response schemas
├── data.py                  # Synthetic Kegalle station state & distance matrix
├── requirements.txt         # Python dependencies
├── README.md                # Backend documentation
├── services/
│   ├── __init__.py
│   ├── allocator.py         # Fixed FCFS vs Smart Pump Allocation logic
│   ├── simulator.py         # Seeded discrete-event simulation engine
│   ├── predictor.py         # Modular deterministic wait-time predictor
│   └── recommender.py       # Station recommendation & eligibility engine
└── tests/
    ├── __init__.py
    ├── test_api.py          # FastAPI TestClient endpoint & contract tests
    └── test_simulator.py    # Simulation, allocation, and edge-case unit tests
```

---

## Quick Start

### 1. Install Dependencies (in `.venv`)
From the repository root:
```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

### 2. Start the FastAPI Server on Port 8000
From the repository root:
```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Interactive Swagger Documentation
Once running, open:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

### 4. Run Automated Tests
```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -v
```
*(or with standard library `unittest`):*
```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
```

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health status, station/pump counts, and prototype disclaimer |
| `GET` | `/stations` | Returns Stations `A`, `B`, `C` with 3 pumps each, fuel stock, and queue telemetry |
| `POST` | `/recommend` | Ranks eligible stations by `travel_time_min + predicted_wait_min` for a location, fuel, and vehicle type |
| `POST` | `/predict` | Predicts queue waiting time and recommends the optimal compatible operational pump |
| `POST` | `/simulate` | Runs a seeded discrete-event simulation (`normal` or `peak`) and updates station telemetry |
| `POST` | `/compare` | Compares Fixed FCFS vs. Smart Allocation on identical seeded arrivals with dynamic improvement metrics |
