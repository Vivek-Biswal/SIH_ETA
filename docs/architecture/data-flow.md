# SIH ETA — Data Flow Documentation

## 1. Request Data Flows

### 1.1 Train Search Flow

```
User (Mobile/Web)
  │
  ├─ GET /api/v1/trains/search?from_station=NDLS&to_station=BCT&date=2026-09-05
  │
Backend API
  ├─ TrainsRouter → TrainsController (validates params)
  │
  └─ TrainService.search_trains(from, to, date)
       │
       └─ TrainRepository.find_trains_between_stations(from, to, date)
            │
            └─ PostgreSQL: JOIN trains + routes + route_stations + schedules
                 │
                 └─ Returns: TrainSearchResponse (list of TrainSummary)
```

### 1.2 ETA Prediction Flow (Cache Miss)

```
User (Mobile/Web)
  │
  ├─ GET /api/v1/trains/12301/eta?date=2026-09-05
  │
Backend API
  ├─ TrainsRouter → ETAController
  │
  └─ ETAService.get_eta(train_no, date)
       │
       ├─ 1. Check Redis: GET train:12301:eta:2026-09-05
       │       → Cache miss
       │
       ├─ 2. RunningStatusRepository.get_current_status(train_no, date)
       │       → PostgreSQL: running_status + station_running_halts
       │
       ├─ 3. DelayHistoryRepository.get_features(train_no, station_codes)
       │       → PostgreSQL: delay_history aggregations
       │
       ├─ 4. NetworkIntelligenceService.get_congestion_scores(segments)
       │       → intelligence/network_intelligence/inference/
       │       → Returns: dict[segment_id, float]
       │
       ├─ 5. WeatherService.get_conditions(station_codes)
       │       → External weather API
       │
       ├─ 6. ETAPredictor.predict(train_no, features)
       │       → intelligence/train_eta/inference/predictor.py
       │       → XGBoost model inference
       │       → Returns: ETAPrediction
       │
       ├─ 7. Redis: SET train:12301:eta:2026-09-05 (TTL: 60s)
       │
       └─ 8. Return ETAResponse to client
```

### 1.3 Real-Time WebSocket Flow

```
Client
  │
  ├─ WS Connect: /ws/trains/12301/live
  │
Backend
  ├─ WebSocket handler: subscribes to Redis channel "channel:train:12301"
  │
Background Job (polls NTES every 30s)
  ├─ Fetches train 12301 position from NTES API
  ├─ Updates PostgreSQL: running_status + station_running_halts
  ├─ Updates Redis: train:12301:position (TTL: 5min)
  └─ Publishes to Redis channel: "channel:train:12301"
       {type: "position_update", delay: 18, current_station: "ALD", ...}
  │
Backend WebSocket handler
  ├─ Receives Redis event
  └─ Broadcasts to all connected clients for train 12301
  │
Client
  └─ Updates UI with new position and delay info
```

---

## 2. ML Training Data Flow

```
External Sources (NTES historical dumps, IMD weather, timetable PDFs)
  │
  ▼ data/raw/           (Git-ignored, downloaded manually or via DVC)
  │
intelligence/train_eta/preprocessing/
  │  - Handle missing values
  │  - Remove outliers
  │  - Standardize formats
  ▼
intelligence/train_eta/features/
  │  - Build feature matrix
  │  - Temporal encoding, rolling averages, lag features
  ▼ data/processed/      (Git-ignored)
  │
intelligence/train_eta/training/
  │  - Train XGBoost / LightGBM
  │  - Cross-validation
  ▼
intelligence/train_eta/evaluation/
  │  - Compute MAE, RMSE, % within 5/15 min
  │  - Compare to naive baseline
  ▼
intelligence/train_eta/models/saved/
  │  - Serialize model (pickle / ONNX)
  │  - Log to MLflow / WandB (optional)
  ▼
intelligence/train_eta/inference/predictor.py
  │  - Load saved model
  │  - Expose ETAPredictor.predict() interface
  ▼
backend/services/eta_service.py
  │  - Calls ETAPredictor
  │  - Packages result into API response
```

---

## 3. Shared Contract Update Flow

```
Team identifies need to change an API endpoint or schema
  │
  ├─ 1. Discuss in team channel / GitHub issue
  │
  ├─ 2. Update shared/api_contracts/api-contract.yaml
  │       (Breaking changes → version bump: /api/v2/)
  │
  ├─ 3. Update docs/api/api-contract.md (human-readable)
  │
  ├─ 4. Open PR with [Shared] prefix, tag all team leads as reviewers
  │
  ├─ 5. PR approved → merge to develop
  │
  ├─ 6. Each team updates their implementation:
  │       Backend: update route, controller, schema
  │       Mobile: update DTO, repository
  │       Web: update service, TypeScript types
  │
  └─ 7. Integration tested via tests/integration/
```
