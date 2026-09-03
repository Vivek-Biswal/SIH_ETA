<p align="center">
  <img src="docs/architecture/assets/banner.png" alt="SIH ETA Banner" width="800"/>
</p>

<h1 align="center">🚆 SIH ETA — Dynamic Train Arrival Prediction System</h1>

<p align="center">
  <strong>Smart India Hackathon 2026 · Problem Statement SIH26028 · Ministry of Railways</strong>
</p>

<p align="center">
  <a href="#architecture">Architecture</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#team">Team</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

## What This Project Does

**SIH ETA** provides high-precision, dynamic Expected Time of Arrival (ETA) predictions for Indian coaching trains. Rather than relying on static schedule offsets, the system ingests real-time train running data, historical delay patterns, weather, route congestion, and network topology to predict ETA with significantly better accuracy than existing methods.

**Key capabilities:**
- 🧠 **ML-powered ETA engine** — trained on historical NTES data with real-time adaptation
- 🕸️ **Network intelligence** — graph-based route analysis, congestion detection, conflict identification
- 📱 **Flutter mobile app** — commuter-facing, live ETA tracking, push notifications
- 🌐 **Web dashboard** — operations view, analytics, network map visualization
- ⚡ **FastAPI backend** — async, auto-documented REST + WebSocket API
- 🗄️ **PostgreSQL + Redis** — relational schedule storage + real-time cache

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│    Flutter Mobile App          Next.js Web Dashboard            │
└───────────────────────┬─────────────────────┬───────────────────┘
                        │    REST + WebSocket  │
                        ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API LAYER                          │
│                    FastAPI (Python 3.11+)                        │
│   Routes → Controllers → Services → Repositories               │
└──────────────┬───────────────────────────────┬──────────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────┐   ┌───────────────────────────────────┐
│       DATA LAYER         │   │       INTELLIGENCE LAYER          │
│  PostgreSQL  │  Redis    │   │  Train ETA │  Network Intelligence │
│  (schedules) │  (cache)  │   │  (ML/graph models + inference)    │
└──────────────────────────┘   └───────────────────────────────────┘
               ▲                               ▲
               │                               │
               └──────────── NTES / External APIs ─────────────────
```

See [`docs/architecture/system-architecture.md`](docs/architecture/system-architecture.md) for the detailed design.

---

## Repository Structure

```
SIH_ETA/
├── apps/
│   ├── mobile/flutter_app/          # Flutter cross-platform mobile app
│   └── web/web_app/                 # Next.js web dashboard
│
├── backend/                         # FastAPI backend service
│   ├── api/                         # Routes, controllers, validators
│   ├── services/                    # Business logic layer
│   ├── repositories/                # Database access layer
│   ├── models/                      # SQLAlchemy ORM models
│   ├── database/                    # Migrations, seeds, connection
│   ├── middleware/                  # Auth, logging, rate limiting
│   ├── config/                      # App configuration
│   └── tests/                       # Backend unit + integration tests
│
├── intelligence/                    # AI/ML subsystems
│   ├── train_eta/                   # Train ETA prediction pipeline
│   └── network_intelligence/        # Graph-based network analysis
│
├── data/
│   ├── raw/                         # Raw source data (Git-ignored; use DVC)
│   ├── processed/                   # Processed feature data (Git-ignored)
│   ├── sample/                      # Small sample datasets for dev/testing
│   └── schemas/                     # Data schema definitions (JSON Schema)
│
├── shared/
│   ├── api_contracts/               # OpenAPI specs + contract docs
│   ├── schemas/                     # Shared Pydantic / JSON schemas
│   ├── constants/                   # Cross-team constants
│   └── documentation/               # Integration guides
│
├── docs/                            # All project documentation
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── intelligence/
│   ├── frontend/
│   └── development/
│
├── scripts/                         # Dev utility scripts
├── tests/                           # Cross-service integration + E2E tests
│   ├── integration/
│   └── end_to_end/
│
├── .github/workflows/               # CI/CD GitHub Actions pipelines
├── .env.example                     # Environment variable template
├── .gitignore
├── CONTRIBUTING.md
└── README.md  ← you are here
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend API | [FastAPI](https://fastapi.tiangolo.com/) | 0.115.x |
| Language (Backend/ML) | Python | 3.11+ |
| ML / ETA | scikit-learn, XGBoost, PyTorch | latest stable |
| Primary Database | PostgreSQL | 16+ |
| Cache / Pub-Sub | Redis | 7.x |
| Mobile App | Flutter + Dart | 3.x |
| Web Dashboard | Next.js + TypeScript | 14.x |
| ORM | SQLAlchemy (async) | 2.x |
| Migrations | Alembic | 1.x |
| API Documentation | OpenAPI (auto-generated) | — |
| CI/CD | GitHub Actions | — |
| State Management (Flutter) | Riverpod | 2.x |
| State Management (Web) | Zustand | 4.x |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Flutter 3.x SDK
- Node.js 20+
- PostgreSQL 16+
- Redis 7.x

### 1. Clone the repository

```bash
git clone https://github.com/Vivek-Biswal/SIH_ETA.git
cd SIH_ETA
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### 3. Run the Backend API

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head         # Run database migrations
uvicorn main:app --reload
```

API will be available at: `http://localhost:8000`
Auto-docs: `http://localhost:8000/docs`

### 4. Run the Flutter Mobile App

```bash
cd apps/mobile/flutter_app
flutter pub get
flutter run
```

### 5. Run the Web Dashboard

```bash
cd apps/web/web_app
npm install
cp .env.example .env.local   # configure NEXT_PUBLIC_* vars
npm run dev
```

Web app: `http://localhost:3000`

### 6. Run the Intelligence Service (Development)

```bash
cd intelligence
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# See intelligence/README.md for data setup instructions
```

---

## Team Ownership

| Module | Directory | Responsible Area |
|---|---|---|
| **UI / Mobile** | `apps/mobile/` | Flutter app, Dart features |
| **UI / Web** | `apps/web/` | Next.js dashboard, TypeScript |
| **Backend / API** | `backend/` | FastAPI, services, repositories |
| **Database** | `backend/database/` | PostgreSQL schema, migrations |
| **Train Intelligence** | `intelligence/train_eta/` | ETA ML model, inference |
| **Network Intelligence** | `intelligence/network_intelligence/` | Graph models, route analysis |
| **Shared Contracts** | `shared/` | API specs, schemas (all teams) |

---

## Integration Flow

All integration between teams happens through:
1. **REST + WebSocket APIs** documented in [`shared/api_contracts/`](shared/api_contracts/)
2. **Pydantic schemas** in [`shared/schemas/`](shared/schemas/)
3. **OpenAPI spec** auto-generated at `http://localhost:8000/docs`

No team should bypass the API layer to access another team's data or logic directly.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Branch naming conventions
- Commit message format
- Pull request process
- Code review guidelines
- Where each type of code belongs

---

## License

This project is developed for Smart India Hackathon 2026.
Problem Statement: SIH26028 | Ministry of Railways
