# Frontend to Backend API Mapping

This document provides a complete, end-to-end mapping of data flow from the UI screens in both the web (Next.js) and mobile (Flutter) applications down to the underlying Supabase tables and intelligence modules.

## Web Application (Next.js Dashboard)

### 1. Dashboard Overview (`/dashboard`)
Displays high-level KPIs, priority monitored trains, and zonal congestion breakdowns.
- **UI Data**: `TrainStatus` array, `NetworkZoneStatus` array
- **API Endpoint**: 
  - `GET /api/v1/trains/search`
  - `GET /api/v1/network/status` (or `GET /api/network`)
- **Service**: `TrainController`, `NetworkController`
- **Intelligence**: `NetworkProvider` (Mock/Real Network Intelligence)
- **Supabase**: `trains` table (joined with `stations`)

### 2. Train Registry & Search (`/trains`)
Allows filtering and searching for active train services.
- **UI Data**: `TrainStatus` array
- **API Endpoint**: `GET /api/v1/trains/search`
- **Service**: `TrainController` (via `TrainRepository.search_trains`)
- **Intelligence**: N/A (Direct DB query)
- **Supabase**: `trains` table, `stations` table

### 3. Train Details (`/trains/[id]`)
Displays live telemetry, speed, next station, and an ETA timeline.
- **UI Data**: `TrainStatus` object, `ETAResponse` object (Station Timeline)
- **API Endpoint**: 
  - `GET /api/v1/trains/{id}/status`
  - `GET /api/trains/{id}/eta` (or `/api/v1/trains/{id}/eta`)
- **Service**: `TrainController`
- **Intelligence**: `ETAProvider` (Vivek Intelligence)
- **Supabase**: `trains`, `train_journeys`, `train_states`, `schedules`, `station_observations` tables; ETA prediction storage.

### 4. ETA Analysis & Delay DNA (`/trains/[id]/eta`)
Deep dive into ML predictive breakdown, confidence scores, and root causes of delays.
- **UI Data**: `ETAResponse` (including `delay_factors`), `DelayDnaResponse`
- **API Endpoint**: 
  - `GET /api/trains/{id}/eta`
  - `GET /api/trains/{id}/delay-dna`
- **Service**: `TrainController` (delegating to ML adapters)
- **Intelligence**: `ETAProvider` (Vivek Intelligence), `DelayDNAProvider` (Train Intelligence)
- **Supabase**: ETA prediction storage, historical delay analytics views/tables.

### 5. Network Operations (`/network`)
System-wide zonal health, active conflicts, and on-time departure index.
- **UI Data**: `NetworkZoneStatus` array
- **API Endpoint**: `GET /api/network`
- **Service**: `NetworkController`
- **Intelligence**: `NetworkProvider` (Network Intelligence/Data)
- **Supabase**: System-level aggregated views, `train_states` table.

### 6. Route Congestion & Bottlenecks (`/network/congestion`)
Track-block occupancy metrics and precedence congestion scores.
- **UI Data**: `RouteCongestionSegment` array, `BottleneckResponse` array
- **API Endpoint**: 
  - `GET /api/v1/network/routes/{id}/congestion`
  - `GET /api/network/bottlenecks`
- **Service**: `NetworkController`
- **Intelligence**: `BottleneckProvider`
- **Supabase**: Congestion analytics tables, active `train_states`.

### 7. Historical Analytics (`/analytics`)
Aggregate performance analysis and top recurring delay services.
- **UI Data**: Historical delay metrics
- **API Endpoint**: (To be implemented/mapped, e.g., `GET /api/analytics/delays`)
- **Service**: Analytics Controller
- **Intelligence**: Historical data aggregation
- **Supabase**: `station_observations`, `train_journeys` over a 30-day window.

### 8. Operations Alerts Center (`/alerts` & `/live`)
Real-time conflict alerts and automated ETA deviation triggers.
- **UI Data**: `RealtimeEvent` stream
- **API Endpoint**: `WS /ws/trains/live`
- **Service**: `WebSocketManager`
- **Intelligence**: All ML models emitting asynchronous `RealtimeEvent` notifications (e.g., CRITICAL, WARNING).
- **Supabase**: N/A (in-memory WebSocket relay, though events may be logged to an `audit_logs` table).

---

## Mobile Application (Flutter)

### 1. Home / Train Search (`/home`, `/train_search`)
Recent searches and active train lookup.
- **UI Data**: Train models
- **API Endpoint**: `GET /api/v1/trains/search`
- **Service**: `TrainController`
- **Intelligence**: N/A
- **Supabase**: `trains` table

### 2. Train Status & Timeline (`/train_status`, `/train_details`)
Current running state and station-by-station progress.
- **UI Data**: Train details and basic ETA models
- **API Endpoint**: 
  - `GET /api/v1/trains/{id}/status`
  - `GET /api/v1/trains/{id}/eta`
- **Service**: `TrainController`
- **Intelligence**: `ETAProvider`
- **Supabase**: `train_journeys`, `train_states`, `schedules`

### 3. Deep ETA & ML Insights (`/eta`)
Advanced predictions (Delay DNA, Recovery, Propagation).
- **UI Data**: Intelligence models (`DelayDnaResponse`, `RecoveryResponse`, `PropagationResponse`)
- **API Endpoint**: 
  - `GET /api/trains/{id}/delay-dna`
  - `GET /api/trains/{id}/recovery`
  - `GET /api/trains/{id}/propagation`
- **Service**: `TrainController`
- **Intelligence**: `DelayDNAProvider`, `RecoveryProvider`, `PropagationProvider` (Ashwin Intelligence)
- **Supabase**: ML prediction storage tables.

### 4. Notifications (`/notifications`)
Push/in-app alerts for watched trains.
- **UI Data**: `RealtimeEvent` models
- **API Endpoint**: `WS /ws/trains/live` (or push notification gateway)
- **Service**: `WebSocketManager`
- **Intelligence**: Event stream from ML models.

---

## Advanced ML Interactions

### What-If Scenarios
Simulate network conditions or train interventions.
- **UI**: (Future/Planning Screens)
- **API Endpoint**: `POST /api/what-if`
- **Service**: `NetworkController.run_what_if`
- **Intelligence**: `ScenarioProvider` (Network Intelligence)
- **Supabase**: Simulated result storage (temporary/cached).

### System Simulation
Run broader network-level simulations.
- **UI**: (Future/Planning Screens)
- **API Endpoint**: `POST /api/simulation`
- **Service**: `NetworkController.run_simulation`
- **Intelligence**: `ScenarioProvider`
- **Supabase**: Simulation result storage.
