# System Architecture — SIH ETA (SIH26028)

## 1. Overview

The SIH ETA system is a **dynamic train arrival prediction platform** for Indian coaching trains. It combines real-time data ingestion, historical pattern learning, and graph-based network intelligence to produce significantly more accurate ETAs than naive schedule-offset methods.

---

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                  │
│                                                                            │
│   ┌──────────────────────────┐      ┌──────────────────────────────────┐  │
│   │  Flutter Mobile App      │      │  Next.js Web Dashboard           │  │
│   │  (Commuter-facing)       │      │  (Operations / Analytics view)   │  │
│   │  - Live ETA display      │      │  - Network map                   │  │
│   │  - Train search          │      │  - Delay analytics               │  │
│   │  - Push notifications    │      │  - Train status overview         │  │
│   └────────────┬─────────────┘      └────────────────┬─────────────────┘  │
└────────────────│────────────────────────────────────────│──────────────────┘
                 │  HTTPS REST / WebSocket                │
                 ▼                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND API LAYER                                │
│                     FastAPI (Python 3.11+, async)                          │
│                                                                            │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────────┐   │
│  │   Routes     │  │  Controllers     │  │  Middleware               │   │
│  │  /api/v1/    │→ │  (request        │  │  - JWT Auth               │   │
│  │  trains/     │  │   handling)      │  │  - Rate Limiting          │   │
│  │  eta/        │  │                  │  │  - Request Logging        │   │
│  │  network/    │  └────────┬─────────┘  └───────────────────────────┘   │
│  │  stations/   │           │                                             │
│  └──────────────┘           ▼                                             │
│                    ┌──────────────────┐                                   │
│                    │    Services      │ ← Business logic layer            │
│                    │  - TrainService  │                                   │
│                    │  - ETAService    │ → calls intelligence/inference    │
│                    │  - NetworkService│                                   │
│                    └────────┬─────────┘                                   │
│                             │                                             │
│                    ┌────────┴─────────┐                                   │
│                    │  Repositories    │ ← DB access layer                 │
│                    │  (SQLAlchemy)    │                                   │
└────────────────────────────────────────────────────────────────────────────┘
                             │                      │
              ┌──────────────┘                      └─────────────────┐
              ▼                                                        ▼
┌──────────────────────────┐               ┌───────────────────────────────┐
│       DATA LAYER         │               │      INTELLIGENCE LAYER       │
│                          │               │                               │
│  ┌────────────────────┐  │               │  ┌────────────────────────┐  │
│  │  PostgreSQL 16     │  │               │  │  Train ETA Module      │  │
│  │  - trains          │  │               │  │  - Preprocessing       │  │
│  │  - stations        │  │               │  │  - Feature engineering │  │
│  │  - routes          │  │               │  │  - XGBoost / DL model  │  │
│  │  - schedules       │  │               │  │  - Inference API       │  │
│  │  - running_status  │  │               │  └────────────────────────┘  │
│  │  - eta_predictions │  │               │                               │
│  │  - delay_history   │  │               │  ┌────────────────────────┐  │
│  └────────────────────┘  │               │  │  Network Intelligence  │  │
│                          │               │  │  - Railway graph       │  │
│  ┌────────────────────┐  │               │  │  - Route analysis      │  │
│  │  Redis 7           │  │               │  │  - Congestion score    │  │
│  │  - live positions  │  │               │  │  - Conflict detection  │  │
│  │  - ETA cache       │  │               │  └────────────────────────┘  │
│  │  - pub/sub events  │  │               └───────────────────────────────┘
│  └────────────────────┘  │
└──────────────────────────┘
              ▲
              │
┌─────────────────────────────────────────────────────────┐
│            EXTERNAL DATA SOURCES                        │
│   NTES API  │  Weather API  │  IRCTC  │  Historical CSV │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Component Descriptions

### 3.1 Client Layer

| Component | Technology | Purpose |
|---|---|---|
| Mobile App | Flutter 3.x (Dart) | Commuter-facing ETA tracking, train search, notifications |
| Web Dashboard | Next.js 14 (TypeScript) | Operations view, analytics, network visualization |

Both clients are **API-only** — they never access the database directly.

### 3.2 Backend API Layer

Built on **FastAPI** with async SQLAlchemy.

**Layered responsibility:**

```
Request
  ↓
Route (URL dispatch)
  ↓
Controller (request validation, response shaping)
  ↓
Service (business logic, orchestration)
  ↓
Repository (database queries only)
  ↓
Model (SQLAlchemy ORM entity)
```

**Key endpoints (to be specified fully in `docs/api/api-contract.md`):**

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/trains/search` | Search trains by source/destination |
| GET | `/api/v1/trains/{train_no}/status` | Live running status |
| GET | `/api/v1/trains/{train_no}/eta` | Predicted ETA for stations |
| GET | `/api/v1/stations/{station_code}` | Station details |
| GET | `/api/v1/network/status` | Network-wide congestion summary |
| WS | `/ws/trains/{train_no}/live` | WebSocket live position stream |

### 3.3 Intelligence Layer

**Train ETA Module** (`intelligence/train_eta/`):

```
Data ingestion (NTES + historical)
  ↓
Preprocessing (missing value handling, outlier removal)
  ↓
Feature engineering (time-based, route-based, weather, congestion)
  ↓
Model training (XGBoost baseline → deep learning for complex routes)
  ↓
Evaluation (RMSE, MAE vs naive baseline)
  ↓
Inference (REST endpoint or direct Python call from backend service)
```

**Network Intelligence Module** (`intelligence/network_intelligence/`):

- Builds a **railway graph** (stations as nodes, routes as edges)
- Computes route-level **congestion scores**
- Detects **scheduling conflicts** that propagate delays
- Feeds enriched features back into the ETA model

### 3.4 Data Layer

| Store | Technology | What it holds |
|---|---|---|
| Primary DB | PostgreSQL 16 | Schedules, trains, stations, routes, delay history, ETA predictions |
| Cache | Redis 7 | Live train positions, ETA cache (TTL-based), WebSocket pub/sub |

---

## 4. Data Flow

### ETA Prediction Flow

```
1. Client sends GET /api/v1/trains/12345/eta
2. Controller validates request
3. ETAService checks Redis cache (TTL: 60s)
4. Cache miss → ETAService fetches:
   a. Current running status from DB (or NTES API)
   b. Historical delay features from DB
   c. Weather data from weather API
   d. Network congestion score from NetworkIntelligenceService
5. ETAService calls intelligence/train_eta/inference/ with feature vector
6. ML model returns predicted delay at each remaining station
7. ETAService adds predicted delay to scheduled time → ETA per station
8. Result cached in Redis
9. Response returned to client
```

### Real-Time Update Flow

```
1. Background job polls NTES API every N seconds
2. Updates train position in Redis
3. Publishes event on Redis pub/sub channel: train:{train_no}:update
4. WebSocket handler receives event
5. Broadcasts to all connected clients subscribed to that train
6. Client UI updates live
```

---

## 5. Security Architecture

- All API endpoints protected by **JWT authentication**
- Secrets stored in **environment variables only** (never committed)
- Database credentials never exposed to clients
- Redis not exposed publicly
- Rate limiting on all public endpoints

---

## 6. Scalability Considerations (Future)

The current architecture is a **modular monolith** — intentionally simpler for the hackathon prototype. It is designed to split into microservices if needed:

- The `intelligence/` layer can become an independent Python service
- The `backend/` can become multiple FastAPI services by feature area
- PostgreSQL can be sharded by region if needed
- Redis Cluster for horizontal scaling

These changes require updating `shared/api_contracts/` and `docs/architecture/` and should be agreed on by the whole team before implementation.
