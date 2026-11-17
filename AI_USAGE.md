# AI Usage and Transparency Statement

### Project: FuelFlow AI
**BuildX 0.1 Hackathon — Challenge 10: Intelligent Queue Prediction and Service Allocation**

---

## 1. AI Tools Used

During the design and implementation of **FuelFlow AI**, the team utilized the following AI tools and foundational models:
- **Google Antigravity Agentic Coding Assistant**: Orchestrated development turns, code generation, linting verification, and test execution.
- **Gemini Foundation Models (Gemini 3.8 Flash & Pro)**: Assisted with architectural design, algorithm development, machine learning pipeline construction, UI component authoring, and documentation.

---

## 2. Scope of AI Assistance

AI assistance was applied across specific engineering phases of the project:

### A. Frontend Architecture & UI/UX Design
- **Component Authoring**: Scaffolded React 19 functional components (`DriverPortal.jsx`, `ManagerPortal.jsx`, `Header.jsx`) adhering to clean component separation.
- **Design System & Styling**: Assisted in formulating the dark navy theme (`#060B18`, `#111E38`) paired with emerald green (`#10B981`) and cyan (`#06B6D4`) SaaS accents, glassmorphic cards, and responsive CSS grids.
- **Interactive Data Visualization**: Assisted in configuring **Recharts** charts (AreaChart for queue congestion timeline and grouped BarChart for station waiting comparisons).
- **Graceful Offline Mode**: Assisted in creating `demoData.js` and fallback handlers in `api.js` ensuring full visual functionality even when the backend is offline.

### B. Backend Engineering & Discrete-Event Simulation
- **FastAPI Endpoints**: Assisted in writing RESTful endpoint handlers and Pydantic v2 schemas (`schemas.py`) matching the frontend's API contract.
- **Simulation Modeling**: Assisted in constructing the seeded discrete-event simulation engine (`simulator.py`) and queue allocator (`allocator.py`), modeling vehicle arrivals across normal and peak scenarios with vehicle-specific service durations.
- **Fairness in Strategy Comparison**: Structured paired simulations on identical seeds to compare Fixed FCFS vs. FuelFlow Smart Allocation fairly.

### C. Machine Learning Engineering
- **Target Leakage Safeguards**: AI assisted in auditing feature inputs to ensure strict separation between arrival-time observable telemetry (`station_id`, `fuel_type`, `vehicle_type`, `queue_length`, `active_compatible_pumps`, `estimated_service_min`, `workload_min`) and post-service outcome metrics (`actual_service_min`, `service_start_min`, `service_end_min`, `completion_time`).
- **Scikit-Learn Pipeline**: Assisted in structuring an end-to-end `Pipeline` combining `OneHotEncoder` and `RandomForestRegressor`, performing an 80/20 train/test split, calculating MAE and RMSE metrics, and serializing the model artifact to `backend/models/wait_time_model.joblib`.
- **Inference Integration**: Assisted in building `RandomForestWaitPredictor` inside `predictor.py` and linking it to `POST /predict` and `POST /recommend`.

### D. Data Persistence & Bug Resolution
- **SQLite Storage**: Generated `database.py` with schema creation and session management.
- **Debugging & Error Fixes**:
  - Identified and resolved the missing `react-is` peer dependency for Recharts with React 19.
  - Refactored ESLint v9 static component render violations in `ManagerPortal.jsx`.
  - Resolved SQLite connection lifecycle handling on Windows to prevent `PermissionError: [WinError 32]` during file unlink operations.

---

## 3. Human Review, Verification & Validation

All AI-generated code and design patterns were systematically inspected, tested, and validated:
- **Independent Automated Testing**: Ran automated test suites across all 19 unit and integration tests (`pytest` and `unittest`), verifying that all API contracts, simulation properties, and ML metrics operate as specified.
- **Mathematical Equivalence Verification**: Verified that calling `POST /predict` yields the identical floating-point prediction as calling the serialized `RandomForestRegressor` pipeline directly on the same feature vector (verified at 10.9 min and 11.7 min).
- **Codebase Integrity**: Confirmed that the model is genuinely loaded from disk (`backend/models/wait_time_model.joblib`) rather than returning mocked or hardcoded values.
- **Target Leakage Audit**: Confirmed by unit tests that no target leakage features exist in the model's feature column registry.

---

## 4. Limitations and Responsible AI Considerations

The team applied responsible AI principles throughout the development of FuelFlow AI:
1. **Prominent Simulation Labeling**: The application transparently displays `"PROTOTYPE — SIMULATED DATA"` across both frontend portals, API responses, database records, and documentation. No simulated output is misrepresented as live real-time GPS or actual certified refinery stock.
2. **Defensive Fallback Mechanism**: The backend implements a modular protocol pattern (`WaitPredictorProtocol`). If the trained ML model artifact is unavailable or corrupted, the system automatically falls back to a deterministic queue-workload estimator rather than failing silently or crashing.
3. **Driver Safety & Non-Misleading Recommendations**: Recommendation logic strictly excludes stations with depleted fuel stock or inactive compatible dispensers, preventing drivers from being directed to non-viable fueling locations.
