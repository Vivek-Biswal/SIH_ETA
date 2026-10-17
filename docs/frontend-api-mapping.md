# Frontend to Backend API Mapping

> Historical mapping. Compatibility endpoints can return illustrative data;
> consult the [current passenger API guide](api/api-contract.md) before using
> these interfaces as live evidence.

This document records the proposed data flow from web (Next.js) and mobile
(Flutter) screens to the underlying Supabase tables, prediction modules and
network analysis. It does not establish that each proposed integration is live.

## Web Application (Next.js Dashboard)

### 1. Dashboard Overview (`/dashboard`)
Displays high-level KPIs, priority monitored trains, and zonal congestion breakdowns.
- **UI Data**: `TrainStatus` array, `NetworkZoneStatus` array
- **API Endpoint**: 
  - `GET /api/v1/trains/search`
  - `GET /api/v1/network/status` (or `GET /api/network`)
- **Service**: `TrainController`, `NetworkController`
- **Prediction / analysis**: `NetworkProvider` (illustrative/live network data)
- **Supabase**: `trains` table (joined with `stations`)

### 2. Train Registry & Search (`/trains`)
Allows filtering and searching for active train services.
- **UI Data**: `TrainStatus` array
- **API Endpoint**: `GET /api/v1/trains/search`
- **Service**: `TrainController` (via `TrainRepository.search_trains`)
- **Prediction / analysis**: N/A (Direct DB query)
- **Supabase**: `trains` table, `stations` table

### 3. Train Details (`/trains/[id]`)
Displays live telemetry, speed, next station, and an ETA timeline.
- **UI Data**: `TrainStatus` object, `ETAResponse` object (Station Timeline)
- **API Endpoint**: 
  - `GET /api/v1/trains/{id}/status`
  - `GET /api/trains/{id}/eta` (or `/api/v1/trains/{id}/eta`)
- **Service**: `TrainController`
- **Prediction / analysis**: `ETAProvider`
- **Supabase**: `trains`, `train_journeys`, `train_states`, `schedules`, `station_observations` tables; ETA prediction storage.

### 4. ETA Analysis & Delay DNA (`/trains/[id]/eta`)
Deep dive into prediction breakdown, confidence scores, and root causes of delays.
- **UI Data**: `ETAResponse` (including `delay_factors`), `DelayDnaResponse`
- **API Endpoint**: 
  - `GET /api/trains/{id}/eta`
  - `GET /api/trains/{id}/delay-dna`
- **Service**: `TrainController` (delegating to prediction adapters)
- **Prediction / analysis**: `ETAProvider`, `DelayDNAProvider`
- **Supabase**: ETA prediction storage, historical delay analytics views/tables.

### 5. Network Operations (`/network`)
System-wide zonal health, active conflicts, and on-time departure index.
- **UI Data**: `NetworkZoneStatus` array
- **API Endpoint**: `GET /api/network`
- **Service**: `NetworkController`
- **Prediction / analysis**: `NetworkProvider` (network analysis/data)
- **Supabase**: System-level aggregated views, `train_states` table.

### 6. Route Congestion & Bottlenecks (`/network/congestion`)
Track-block occupancy metrics and precedence congestion scores.
- **UI Data**: `RouteCongestionSegment` array, `BottleneckResponse` array
- **API Endpoint**: 
  - `GET /api/v1/network/routes/{id}/congestion`
  - `GET /api/network/bottlenecks`
- **Service**: `NetworkController`
- **Prediction / analysis**: `BottleneckProvider`
- **Supabase**: Congestion analytics tables, active `train_states`.

### 7. Historical Analytics (`/analytics`)
Aggregate performance analysis and top recurring delay services.
- **UI Data**: Historical delay metrics
- **API Endpoint**: (To be implemented/mapped, e.g., `GET /api/analytics/delays`)
- **Service**: Analytics Controller
- **Prediction / analysis**: Historical data aggregation
- **Supabase**: `station_observations`, `train_journeys` over a 30-day window.

### 8. Operations Alerts Center (`/alerts` & `/live`)
Real-time conflict alerts and automated ETA deviation triggers.
- **UI Data**: `RealtimeEvent` stream
- **API Endpoint**: `WS /ws/trains/live`
- **Service**: `WebSocketManager`
- **Prediction / analysis**: Prediction services emitting asynchronous `RealtimeEvent` notifications (e.g., CRITICAL, WARNING).
- **Supabase**: N/A (in-memory WebSocket relay, though events may be logged to an `audit_logs` table).

---

## Mobile Application (Flutter)

### 1. Home / Train Search (`/home`, `/train_search`)
Recent searches and active train lookup.
- **UI Data**: Train models
- **API Endpoint**: `GET /api/v1/trains/search`
- **Service**: `TrainController`
- **Prediction / analysis**: N/A
- **Supabase**: `trains` table

### 2. Train Status & Timeline (`/train_status`, `/train_details`)
Current running state and station-by-station progress.
- **UI Data**: Train details and basic ETA models
- **API Endpoint**: 
  - `GET /api/v1/trains/{id}/status`
  - `GET /api/v1/trains/{id}/eta`
- **Service**: `TrainController`
- **Prediction / analysis**: `ETAProvider`
- **Supabase**: `train_journeys`, `train_states`, `schedules`

### 3. Detailed ETA Insights (`/eta`)
Advanced predictions (Delay DNA, Recovery, Propagation).
- **UI Data**: Analysis response models (`DelayDnaResponse`, `RecoveryResponse`, `PropagationResponse`)
- **API Endpoint**: 
  - `GET /api/trains/{id}/delay-dna`
  - `GET /api/trains/{id}/recovery`
  - `GET /api/trains/{id}/propagation`
- **Service**: `TrainController`
- **Prediction / analysis**: `DelayDNAProvider`, `RecoveryProvider`, `PropagationProvider`
- **Supabase**: Prediction storage tables.

### 4. Notifications (`/notifications`)
Push/in-app alerts for watched trains.
- **UI Data**: `RealtimeEvent` models
- **API Endpoint**: `WS /ws/trains/live` (or push notification gateway)
- **Service**: `WebSocketManager`
- **Prediction / analysis**: Event stream from prediction services.

---

## Advanced Prediction Interactions

### What-If Scenarios
Simulate network conditions or train interventions.
- **UI**: (Future/Planning Screens)
- **API Endpoint**: `POST /api/what-if`
- **Service**: `NetworkController.run_what_if`
- **Prediction / analysis**: `ScenarioProvider` (network analysis)
- **Supabase**: Simulated result storage (temporary/cached).

### System Simulation
Run broader network-level simulations.
- **UI**: (Future/Planning Screens)
- **API Endpoint**: `POST /api/simulation`
- **Service**: `NetworkController.run_simulation`
- **Prediction / analysis**: `ScenarioProvider`
- **Supabase**: Simulation result storage.
