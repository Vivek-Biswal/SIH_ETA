# Remaining Work Roadmap

## PRIORITY 1 — CRITICAL (Required for Prototype MVP)

### 1. Build Backend API Server & Connect Database
- **TASK:** Create a FastAPI/Django backend that imports `src/system/orchestrator.py` and exposes the `process_request` via a REST endpoint.
- **OWNER:** Varun
- **DEPENDENCY:** None (Group A orchestrator is complete).
- **WHY IT IS NEEDED:** The frontend needs a live HTTP server to request ETAs. Group A only provided the core Python engine.
- **ESTIMATED COMPLEXITY:** Medium
- **EXPECTED OUTPUT:** A running backend server exposing `POST /api/v1/eta`.

### 2. Implement Frontend Dashboard & Apps
- **TASK:** Build the Next.js/Flutter UI mapping to the established backend endpoints, ensuring ETA displays are clearly labeled as baseline/delay-adjusted (not ML).
- **OWNER:** Sneha
- **DEPENDENCY:** Varun's API deployment.
- **WHY IT IS NEEDED:** End-users need a visual interface to track trains.
- **ESTIMATED COMPLEXITY:** High
- **EXPECTED OUTPUT:** Working UI tracking trains.

### 3. Establish Live Telemetry Database (Time-Series)
- **TASK:** Build a scheduled polling service (e.g., using Celery or Cron) to fetch live train states (delay, position) every 5 minutes and save them chronologically.
- **OWNER:** Varun
- **DEPENDENCY:** None.
- **WHY IT IS NEEDED:** This is the *only* way to ever unblock ML modeling. Without historical telemetry, AI prediction remains mathematically impossible.
- **ESTIMATED COMPLEXITY:** High
- **EXPECTED OUTPUT:** Database table `LIVE_OBSERVATIONS` actively populating.

---

## PRIORITY 2 — REQUIRED FOR PROTOTYPE (Enhancements)

### 4. Live Data Integration
- **TASK:** Connect the backend API to the RailRadar/NTES client to fetch real-time `current_delay_minutes` to feed into the Group A orchestrator.
- **OWNER:** Varun
- **DEPENDENCY:** None.
- **WHY IT IS NEEDED:** Without live inputs, the system falls back entirely to the `SCHEDULE_BASELINE`.
- **ESTIMATED COMPLEXITY:** Medium
- **EXPECTED OUTPUT:** Live delay passed to `ETAOrchestrator`.

---

## PRIORITY 3 — IMPROVEMENTS (Future ML Phase)

### 5. Train Delay-DNA Recovery Model
- **TASK:** Utilize the time-series telemetry (once collected for ~30 days) to compute station-to-station delay recovery rates.
- **OWNER:** Ashwin
- **DEPENDENCY:** Task 3 (Time-Series Database) must have 30+ days of data.
- **WHY IT IS NEEDED:** To predict if a delayed train will make up time.
- **ESTIMATED COMPLEXITY:** High
- **EXPECTED OUTPUT:** First true ML inference predicting recovery.

### 6. Train ETA Machine Learning Model
- **TASK:** Train an XGBoost/LightGBM model to predict `actual_arrival_time` using the static, route, and historical features built by Group A, joined with the new live time-series tracking data.
- **OWNER:** Ashwin
- **DEPENDENCY:** Task 3.
- **WHY IT IS NEEDED:** To replace the deterministic baseline with statistical AI prediction.
- **ESTIMATED COMPLEXITY:** Very High
- **EXPECTED OUTPUT:** An ML model outperforming the `DELAY_ADJUSTED_BASELINE`.
