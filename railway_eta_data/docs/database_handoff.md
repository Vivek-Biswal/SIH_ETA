# Database Handoff Contract (For VARUN)

This document describes the recommended database architecture for integrating the Group A pipeline into the production backend, as well as the future schema required to support true ML ETA prediction.

## 1. Recommended Conceptual Entities (Current Needs)

To support the current deterministic ETA baselines, the backend database should represent the following entities:

### `TRAINS` (Static)
- `train_number` (String, Primary Key)
- `train_name` (String)
- `type` (String)
- `distance` (Float)

### `STATIONS` (Static)
- `station_code` (String, Primary Key)
- `station_name` (String)
- `latitude` (Float, Optional)
- `longitude` (Float, Optional)

### `SCHEDULES` (Static)
- `id` (UUID, Primary Key)
- `train_number` (Foreign Key -> TRAINS)
- `station_code` (Foreign Key -> STATIONS)
- `route_order` (Integer)
- `arrival_time` (String "HH:MM:SS")
- `departure_time` (String "HH:MM:SS")
- `day_offset` (Integer)

### `ETA_REQUESTS` (Dynamic / Logging)
- `id` (UUID, Primary Key)
- `train_number` (Foreign Key)
- `destination_station` (Foreign Key)
- `request_timestamp` (Timestamp)
- `predicted_arrival` (Timestamp)
- `prediction_method` (String)

## 2. Future Live Observation Schema (For ML Readiness)

**CRITICAL:** The current system lacks historical time-aligned telemetry. To train an ML model in the future, the backend MUST begin collecting continuous train movement histories.

### `LIVE_OBSERVATIONS` (Dynamic / Time-Series)
- `id` (UUID, Primary Key)
- `train_number` (String, Index)
- `observation_timestamp` (Timestamp, Index)
- `current_station` (String, Optional)
- `latitude` (Float, Optional)
- `longitude` (Float, Optional)
- `speed_kmh` (Float, Optional)
- `current_delay_minutes` (Float)
- `next_station` (String, Optional)
- `source` (String)

*Note: This table will form the dataset required to build the `actual_arrival_time` and `historical_trajectory` features required for ML training and delay recovery analysis.*
