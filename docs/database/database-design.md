# Database Design — SIH ETA (SIH26028)
# Version: 1.0.0-draft
# Last Updated: 2026-09-03

## 1. Overview

The primary datastore is **PostgreSQL 16**. It holds:
- Static railway reference data (trains, stations, routes, schedules)
- Running status data (synced from NTES or manually ingested)
- Historical delay records (for ML model training)
- ETA predictions (stored for monitoring and model evaluation)

**Redis 7** is used as a cache and pub/sub broker (see Section 5).

Database access is **exclusively via the backend's repository layer**. No direct DB access from mobile, web, or intelligence modules.

---

## 2. Entity Relationship Overview

```
stations ──< route_stations >── routes
   │                               │
   │                               │
trains ────< schedules >─────── routes
   │
   │
running_status ──< station_halts >── stations
   │
   │
eta_predictions ──< station_etas >── stations
   │
delay_history
```

---

## 3. Core Tables

### 3.1 `stations`

Stores all Indian railway stations.

| Column | Type | Description |
|---|---|---|
| `station_id` | UUID (PK) | Internal unique ID |
| `code` | VARCHAR(10) UNIQUE | Station code (e.g., NDLS, BCT) |
| `name` | VARCHAR(200) | Full station name |
| `state` | VARCHAR(100) | Indian state |
| `zone` | VARCHAR(10) | IR zone (NR, SR, WR, etc.) |
| `latitude` | DECIMAL(9,6) | GPS latitude |
| `longitude` | DECIMAL(9,6) | GPS longitude |
| `platform_count` | SMALLINT | Number of platforms |
| `is_junction` | BOOLEAN | True if it's a junction station |
| `created_at` | TIMESTAMPTZ | Record creation time |

**Indexes:** `code` (unique), `name` (GIN for text search)

---

### 3.2 `trains`

Master train information.

| Column | Type | Description |
|---|---|---|
| `train_id` | UUID (PK) | Internal ID |
| `train_number` | VARCHAR(5) UNIQUE | 5-digit IR train number |
| `train_name` | VARCHAR(200) | Train name |
| `train_type` | VARCHAR(50) | Rajdhani, Shatabdi, Mail, Express, etc. |
| `origin_station_id` | UUID (FK → stations) | Starting station |
| `destination_station_id` | UUID (FK → stations) | Final station |
| `zone` | VARCHAR(10) | Operating zone |
| `created_at` | TIMESTAMPTZ | — |

---

### 3.3 `routes`

A route defines the ordered sequence of stations for a train.

| Column | Type | Description |
|---|---|---|
| `route_id` | UUID (PK) | — |
| `train_id` | UUID (FK → trains) | Which train this route belongs to |
| `effective_from` | DATE | Date from which route is valid |
| `effective_to` | DATE NULLABLE | Date until route is valid (null = indefinite) |

---

### 3.4 `route_stations`

Ordered station sequence within a route (the timetable).

| Column | Type | Description |
|---|---|---|
| `route_station_id` | UUID (PK) | — |
| `route_id` | UUID (FK → routes) | Parent route |
| `station_id` | UUID (FK → stations) | Station on this route |
| `sequence_number` | SMALLINT | Stop order (1 = origin) |
| `scheduled_arrival` | TIME NULLABLE | Null for origin |
| `scheduled_departure` | TIME NULLABLE | Null for destination |
| `halt_duration_minutes` | SMALLINT | Scheduled halt in minutes |
| `distance_from_origin_km` | DECIMAL(8,2) | Distance from train origin |
| `days_of_run` | VARCHAR(7) | e.g., "1111110" for Mon-Sat |

---

### 3.5 `running_status`

Daily running status for each train (one row per train per date).

| Column | Type | Description |
|---|---|---|
| `running_id` | UUID (PK) | — |
| `train_id` | UUID (FK → trains) | — |
| `date` | DATE | Running date |
| `overall_status` | VARCHAR(20) | on_time, delayed, cancelled, etc. |
| `current_station_id` | UUID (FK → stations) NULLABLE | Last known position |
| `overall_delay_minutes` | SMALLINT | Delay at last known station |
| `last_updated_at` | TIMESTAMPTZ | When was this record last updated |
| `source` | VARCHAR(50) | ntes_api, manual, scraped |

---

### 3.6 `station_running_halts`

Per-station running data for each running instance.

| Column | Type | Description |
|---|---|---|
| `halt_id` | UUID (PK) | — |
| `running_id` | UUID (FK → running_status) | Parent run |
| `station_id` | UUID (FK → stations) | Which station |
| `sequence_number` | SMALLINT | Order on route |
| `actual_arrival` | TIMESTAMPTZ NULLABLE | Actual arrival time |
| `actual_departure` | TIMESTAMPTZ NULLABLE | Actual departure time |
| `delay_at_arrival` | SMALLINT NULLABLE | Minutes late on arrival |
| `delay_at_departure` | SMALLINT NULLABLE | Minutes late on departure |
| `platform` | VARCHAR(10) NULLABLE | Platform number |
| `status` | VARCHAR(20) | arrived, departed, upcoming, skipped |

---

### 3.7 `delay_history`

Aggregated delay statistics — primary training data for the ML model.

| Column | Type | Description |
|---|---|---|
| `history_id` | UUID (PK) | — |
| `train_id` | UUID (FK → trains) | — |
| `station_id` | UUID (FK → stations) | Which station |
| `date` | DATE | Date of observation |
| `day_of_week` | SMALLINT | 0=Mon ... 6=Sun |
| `month` | SMALLINT | 1-12 |
| `delay_minutes` | SMALLINT | Observed delay |
| `weather_condition` | VARCHAR(50) NULLABLE | Clear, rain, fog, etc. |
| `season` | VARCHAR(20) | summer, monsoon, winter |

**Indexes:** `(train_id, station_id)`, `(date)`, `(day_of_week, month)` — heavily queried by ML feature pipeline.

---

### 3.8 `eta_predictions`

Stored predictions for evaluation and monitoring.

| Column | Type | Description |
|---|---|---|
| `prediction_id` | UUID (PK) | — |
| `running_id` | UUID (FK → running_status) | Which run this was predicted for |
| `predicted_at` | TIMESTAMPTZ | When prediction was generated |
| `model_version` | VARCHAR(50) | Which model version |
| `overall_predicted_delay` | SMALLINT | Predicted total delay at destination |
| `confidence_score` | DECIMAL(5,4) | 0-1 model confidence |

---

### 3.9 `station_eta_predictions`

Per-station ETA predictions.

| Column | Type | Description |
|---|---|---|
| `station_eta_id` | UUID (PK) | — |
| `prediction_id` | UUID (FK → eta_predictions) | Parent prediction |
| `station_id` | UUID (FK → stations) | Which station |
| `scheduled_arrival` | TIMESTAMPTZ | Timetable arrival |
| `predicted_arrival` | TIMESTAMPTZ | ML predicted arrival |
| `predicted_delay_minutes` | SMALLINT | Predicted delay |
| `actual_arrival` | TIMESTAMPTZ NULLABLE | Filled in after train passes (for evaluation) |
| `actual_delay_minutes` | SMALLINT NULLABLE | Actual delay (for evaluation) |

---

## 4. Migration Strategy

- Migrations managed by **Alembic**
- Migration files in `backend/database/migrations/`
- Run migrations: `alembic upgrade head`
- Create new migration: `alembic revision --autogenerate -m "describe change"`
- **Never edit existing migration files** — always create a new one

---

## 5. Redis Schema

Redis is used for ephemeral, high-speed data only.

| Key pattern | Type | TTL | Description |
|---|---|---|---|
| `train:{train_no}:position` | Hash | 5 min | Current position, delay |
| `train:{train_no}:eta:{date}` | Hash | 60 sec | Cached ETA prediction |
| `station:{code}:departures` | Sorted Set | 10 min | Upcoming departures |
| `network:congestion_summary` | Hash | 2 min | Network-wide summary |
| `channel:train:{train_no}` | Pub/Sub | — | WebSocket events channel |

---

## 6. Database Design Principles

1. **UUIDs as primary keys** — avoids sequential ID enumeration attacks
2. **TIMESTAMPTZ everywhere** — all timestamps stored in UTC
3. **Soft deletes where applicable** — prefer `is_active` flag over physical deletion
4. **No application logic in triggers** — keep business logic in the service layer
5. **Index strategy** — add indexes based on actual query patterns in repositories
6. **No raw queries in application code** — use SQLAlchemy ORM or query builder
