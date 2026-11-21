# ⛽ FuelFlow AI

### Intelligent Fuel Station Discovery, Virtual Queue Management, AI Queue Prediction & Smart Pump Allocation

**🥉 3rd Place Winner — BuildX 0.1 Hackathon**

**Hackathon Challenge:** Challenge 10 — Intelligent Queue Prediction and Service Allocation

**Current Version:** FuelFlow AI v1.1 — Portfolio Edition

**Technology Stack:** React 19 | Vite 8 | Python | FastAPI | Scikit-learn | SQLite

**Core Features:** Intelligent Station Recommendations • Virtual Queue Registration • AI-Powered Waiting Time Prediction • Smart Pump Allocation • Interactive Manager Dashboard • Strategy Simulation

**Machine Learning:** Random Forest Regression trained and evaluated using synthetic simulation data.

**Project Type:** Full-Stack AI-Powered Prototype

---
> **PROTOTYPE — SIMULATED DATA DISCLAIMER**  
> All fuel stations, geographic locations, driving distances, fuel availability states, vehicle queues, and ML waiting-time predictions in this project are synthetic and simulated for the fictional Kegalle transport corridor scenario. This project is a demonstration prototype and does not represent live GPS telemetry or certified physical refinery inventories.

---

## 1. Problem Statement

Fuel distribution in developing urban and inter-city corridors frequently experiences severe inefficiencies:
- **Asymmetric Congestion**: Drivers flock to prominent highway stations while nearby stations operate below capacity.
- **Wasted Fuel & Commute Time**: Motorists arrive at stations only to discover their required fuel type (e.g., Diesel or Petrol 95) is depleted or that queues stretch for hundreds of meters.
- **Pump Allocation Inefficiencies**: Traditional First-Come, First-Served (FCFS) pump access allows dual-fuel petrol vehicles to block multi-fuel dispensers equipped with diesel nozzles, causing diesel lorries and buses to queue unnecessarily.
- **Lack of Predictive Visibility**: Motorists choose destinations based purely on proximity rather than total turnaround time (travel time + queue waiting time).

---

## 2. Proposed Solution

**FuelFlow AI** is an intelligent, dual-portal decision support and allocation platform that transforms reactive queueing into coordinated corridor-level optimization:
1. **Multi-Objective Station Discovery (Driver Portal)**: Evaluates driving distance, travel time, fuel availability, and predicted queue wait times to recommend the optimal station minimizing total door-to-pump turnaround.
2. **Machine Learning Queue Prediction**: Utilizes a trained `RandomForestRegressor` pipeline ($R^2 = 0.988$) to accurately forecast wait times based on arrival workload, queue length, and active compatible pumps.
3. **Smart Pump Allocation (Manager Portal)**: Dynamically directs arriving vehicles to compatible dispensers, protecting multi-fuel diesel pumps from petrol congestion and leveling dispenser utilization.
4. **Strategy Simulation & Comparison**: Runs paired discrete-event simulations comparing traditional Fixed FCFS against FuelFlow Smart Allocation on identical arrival streams, demonstrating quantifiable wait-time reductions and throughput gains.
5. **Virtual Queue Registration & Management**: Enables drivers to register their vehicles, select a preferred fuel station, specify their fuel requirements, and join a simulated virtual queue. The system provides queue position and estimated waiting-time information, while allowing station managers to monitor and manage registered vehicles through the Manager Portal.
---

## 3. System Configuration & Prototype Scenario

The system models the **Kegalle transport corridor** with realistic constraints:

### Fictional Prototype Fuel Stations
- **Station A (Kegalle Central Hub)**: 3 active pumps. Stocks Petrol 92, Petrol 95, and Diesel. Moderate urban queue.
- **Station B (Highway Bypass Gateway)**: 2 active pumps, 1 pump in maintenance. Stocks Petrol 92 and Diesel (Petrol 95 depleted). High congestion highway interchange.
- **Station C (Valley Link Depot)**: 3 active pumps. Stocks Petrol 92 and Petrol 95 (Diesel depleted). Lower queue depth.

### Pump Configuration (3 Pumps per Station)
| Pump | Supported Fuels | Operational Note |
| :--- | :--- | :--- |
| **Pump 1** | Petrol 92 + Petrol 95 | Dedicated petrol dispenser |
| **Pump 2** | Petrol 92 + Petrol 95 | Dedicated petrol dispenser (Maintenance at Station B) |
| **Pump 3** | Petrol 92 + Petrol 95 + Diesel | Multi-fuel dispenser (Preserved for Diesel under Smart Allocation) |

### Vehicle & Fuel Taxonomy
- **Total Simulated Vehicles**: 200 vehicles (configurable `50` to `2,000` in simulation runs).
- **Vehicle Categories**: Car / Sedan / SUV, Motorcycle / Scooter, Three Wheeler / TukTuk, Van / Light Commercial, Lorry / Heavy Transport.
- **Fuel Types**: `petrol_92`, `petrol_95`, `diesel`.
### Virtual Queue Configuration (Portfolio Edition)

- **Queue Type:** Simulated virtual fuel-station queue.
- **Driver Registration:** Drivers can enter their vehicle registration number, select their vehicle category, and specify their required fuel type and quantity.
- **Station Selection:** Drivers can select a preferred station from the available fictional fuel stations.
- **Queue Joining:** Registered drivers can join the selected station's virtual queue.
- **Queue Information:** Displays queue position and estimated waiting time based on the prototype's queue-management logic.
- **Manager Visibility:** Station managers can monitor registered vehicles and their virtual queue status through the Manager Portal.
- **Prototype Boundary:** Virtual queue registrations are part of the demonstration system and do not reserve fuel or guarantee a physical position at a real fuel station.
---

## 4. Portals & Features

### Driver Portal
- **Prototype Departure Selector**: Select from fictional Kegalle locations (Clock Tower Center, Bypass Junction, Ranwala Junction, Bandaranayake Mawatha).
- **Fuel & Vehicle Filter**: Filter by Petrol 92, Petrol 95, or Diesel, and calibrate service rates by vehicle type.
- **AI Recommendation Hero**: Automatically highlights the `#1 Best Station` considering fuel availability, travel time, and ML predicted wait time.
- **Nearby Station Telemetry Cards**: Displays real-time queue length, travel duration, predicted wait, total journey bar, and stock chips for Stations A, B, and C.
- **Side-by-Side Comparison Matrix**: Clear tabular breakdown evaluating distance, queue depth, turnaround time, and eligibility.
- **Interactive ML Queue Predictor Drawer**: Test custom inputs against the trained `RandomForestRegressor` (`POST /predict`).
- **Vehicle Registration:** Drivers can enter their vehicle registration number, select their vehicle type, fuel type, and required fuel quantity.
- **Virtual Queue Joining:** Drivers can select a preferred fuel station and join its simulated virtual queue.
- **Queue Position Tracking:** Displays the registered vehicle's current virtual queue position and estimated waiting time.
- **Registration Confirmation:** Provides confirmation after successfully joining the virtual queue.
### Manager Portal
- **Station Switcher**: Inspect telemetry for Station A, Station B, or Station C.
- **KPI Metrics Bar**: Live simulated vehicles, active pump count, average waiting time, peak wait time, and vehicles served.
- **Pump Monitoring Cards**: Real-time status (`active`, `idle`, `maintenance`), vehicle in bay, remaining service countdown, queue at pump, flow rate (L/min), and utilization percentage bar.
- **Simulation Controls**: Adjust vehicle count (`50..500`, default `200`), toggle traffic scenarios (`Normal` 1.0x vs. `Peak` 1.45x), adjust random seed, and trigger `Start Simulation` or `Reset`.
- **Strategy Comparison (Fixed FCFS vs. Smart Allocation)**: Side-by-side KPI cards showing wait reduction percentage and throughput gain, paired with **Recharts** interactive visualizations (AreaChart timeline and BarChart station breakdown).
- **Live Smart Allocation Stream**: Real-time audit log detailing assigned dispensers and the AI optimization rationale (e.g., reserving Pump 3 for imminent diesel trucks).
- **Registered Vehicle Monitoring:** Station managers can view vehicles registered in their station's simulated virtual queue.
- **Virtual Queue Dashboard:** Displays vehicle registration numbers, vehicle types, requested fuel types, fuel quantities, and queue positions.
- **Queue Status Management:** Allows managers to monitor and update registered vehicles' virtual queue statuses.
- **Driver–Manager Integration:** Virtual queue registrations submitted through the Driver Portal are reflected in the corresponding station's Manager Portal.
---

## 5. System Architecture

```text
                           ┌─────────────────────────────────────────┐
                           │            React 19 + Vite              │
                           │     Dark Navy + Emerald/Cyan UI         │
                           │   Recharts Charts + Lucide React        │
                           └────────────────────┬────────────────────┘
                                                │
                                    REST API (JSON over HTTP)
                                                │
                           ┌────────────────────▼────────────────────┐
                           │          FastAPI Backend (8000)         │
                           │         CORS & Pydantic Schemas         │
                           └───────┬────────────┬───────────┬────────┘
                                   │            │           │
         ┌─────────────────────────┘            │           └─────────────────────────┐
         ▼                                      ▼                                     ▼
┌──────────────────┐               ┌─────────────────────────┐               ┌──────────────────┐
│  ML Predictor    │               │ Discrete-Event Engine   │               │ SQLite Database  │
│  RandomForest    │               │ Seeded Sim & Allocator  │               │ fuelflow.db      │
│  wait_time_model │               │ FCFS vs Smart Allocator │               │ Run Summaries    │
└──────────────────┘               └─────────────────────────┘               └──────────────────┘
```

- **Frontend**: React 19, Vite 8, Recharts, Lucide React, vanilla modern CSS with glassmorphism and responsive design.
- **Backend**: FastAPI, Uvicorn, Pydantic v2 schemas, Starlette.
- **Machine Learning**: Scikit-Learn `RandomForestRegressor`, Joblib, NumPy.
- **Database**: Persistent SQLite (`backend/fuelflow.db`) with context-managed connection sessions.

---

## 6. Machine Learning Model & Evaluation

### Training Setup & Target Leakage Prevention
- **Dataset**: **5,727 synthetic records** generated via multi-seed discrete-event simulations covering normal traffic, rush-hour peak surges, and edge conditions.
- **Target Variable**: `wait_min` (simulated minutes spent queueing before reaching the dispenser).
- **Feature Set (Strict Leakage Prevention)**:
  - Categoricals: `station_id`, `fuel_type`, `vehicle_type`
  - Numericals: `queue_length`, `active_compatible_pumps`, `estimated_service_min`, `workload_min`
  - *Prohibited outcome fields (`actual_service_min`, `service_start_min`, `service_end_min`, `completion_time`, `served_within_horizon`) were strictly excluded.*
- **Pre-processing**: `OneHotEncoder(handle_unknown='ignore')` for categoricals, passthrough for numericals inside an end-to-end `Pipeline`.
- **Model Parameters**: `RandomForestRegressor(n_estimators=120, max_depth=14, min_samples_split=4, min_samples_leaf=2, random_state=42)`.
- **Artifact**: Saved as [backend/models/wait_time_model.joblib](backend/models/wait_time_model.joblib) (3.09 MB).

### Evaluation Metrics (Held-out 20% Test Split: 1,146 samples)
| Metric | Value | Description |
| :--- | :--- | :--- |
| **MAE (Mean Absolute Error)** | **1.095 minutes** | Average prediction error |
| **RMSE (Root Mean Squared Error)** | **2.457 minutes** | Penalizes larger outlier variance |
| **$R^2$ Score** | **0.988** | 98.8% of wait-time variance explained |

---

## 7. Strategy Comparison Results (200 Vehicles Benchmark)

When executing paired simulations on identical seeded arrivals (Seed 42, 200 vehicles, 60-minute horizon):

| Metric | Fixed FCFS Allocation | FuelFlow Smart Allocation | Improvement |
| :--- | :---: | :---: | :---: |
| **Average Waiting Time** | 5.9 min | 1.4 min | **-76.3% reduction** |
| **Peak Queue Wait Time** | 18.2 min | 4.8 min | **-73.6% reduction** |
| **Throughput (Vehicles/Hour)** | ~54.2 veh/h | ~84.8 veh/h | **+56.4% throughput gain** |
| **Diesel Bottleneck Events** | 28 blocked trucks | 4 blocked trucks | **-85.7% bottleneck reduction** |

---

## 8. API Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check, station/pump counts, and prototype disclaimer |
| `GET` | `/stations` | Returns Stations A, B, and C with pump telemetry and fuel stock |
| `POST` | `/recommend` | Multi-objective station recommendation based on travel + queue turnaround |
| `POST` | `/predict` | Predicts waiting time using the trained `RandomForestRegressor` model |
| `POST` | `/simulate` | Executes seeded discrete-event simulation and records summary to SQLite |
| `POST` | `/compare` | Executes paired FCFS vs. Smart Allocation comparison and logs to SQLite |
| `GET` | `/simulations/history` | Retrieves recent simulation and comparison execution summaries from SQLite |
| `POST` | `/queue/join` | Register a driver and join a simulated virtual fuel-station queue |
| `GET` | `/queue/registrations` | Retrieve virtual queue registrations with optional filters |
| `PATCH` | `/queue/registrations/{registration_id}/status` | Update vehicle queue status (manager authentication required) |
| `GET` | `/queue/status/{lookup_key}` | Retrieve queue status using registration ID or vehicle number |
---

## 9. Installation & Execution Guide

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+)
### 1. Backend Setup & Startup

From the repository root:

```powershell
# 1. Create a virtual environment (first-time setup only)
python -m venv .venv

# 2. Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# 3. Install backend dependencies
python -m pip install -r backend/requirements.txt

# 4. (Optional) Re-train the Random Forest model
python backend/train_model.py

# 5. Start the FastAPI server on port 8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```


The backend is accessible at:
- **API Base**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

### 2. Frontend Setup & Startup
From the repository root:

```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Start Vite development server
npm run dev
```

The frontend runs at:
- **Driver & Manager Dashboard**: `http://localhost:5173` (or port indicated by Vite)

### 3. Running Automated Tests
```powershell
# Run backend pytest suite (31 tests)
.\.venv\Scripts\python.exe -m pytest -v backend/tests/

# Run frontend linter and production build
cd frontend
npm run lint
npm run build
```

---

## 10. Limitations & Prototype Boundary

- **Simulated Queue & Geographic Data**: Locations, distances, vehicle arrival rates, and service times are synthetic and calibrated for prototype demonstration.
- **Fuel Availability**: Stock levels are simulated flags (`true`/`false`) rather than connected IoT tank telemetry.
- **Single-Corridor Scope**: Demonstrates 3 fuel stations and 9 dispensers along the Kegalle corridor; expansion to nation-wide networks would require real-time telemetry streaming and live GPS routing APIs.

---

## 11. Team Contributions (BuildX 0.1 Hackathon)

- **Frontend & UI/UX Architecture**: Designed modern dark SaaS dashboard, Driver Portal discovery workflows, Manager Portal simulation controls, and interactive Recharts comparison charts.
- **Backend API & Discrete-Event Simulation Engine**: Built FastAPI endpoints, seeded discrete-event queuing simulator, queue balancing allocator, and paired strategy comparison framework.
- **Machine Learning & Queue Prediction**: Curated synthetic simulation dataset, implemented target leakage safeguards, trained and tuned `RandomForestRegressor`, and packaged joblib pipeline.
- **Data Persistence & Integration Testing**: Designed SQLite database layer, ensured Windows file concurrency safety, and built a comprehensive automated test suite (31 tests).
