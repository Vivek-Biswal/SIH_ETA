# Backend — SIH ETA

FastAPI backend service for the SIH ETA project.

## Structure

```
backend/
├── api/
│   ├── routes/          ← URL route definitions (one file per resource)
│   ├── controllers/     ← Request handling, response shaping
│   └── validators/      ← Custom request validators
├── services/            ← Business logic (TrainService, ETAService, etc.)
├── repositories/        ← Database access layer (SQLAlchemy queries)
├── models/              ← SQLAlchemy ORM models
├── database/
│   ├── migrations/      ← Alembic migration files
│   ├── seed/            ← Dev/test seed data scripts
│   ├── connection/      ← DB engine setup, session factory
│   ├── queries/         ← Complex raw SQL queries (if needed)
│   └── schemas/         ← SQLAlchemy schema utilities
├── middleware/          ← Auth, logging, rate limiting
├── config/              ← App settings (pydantic-settings)
├── tests/
│   ├── unit/            ← Unit tests (services, repositories)
│   └── integration/     ← Integration tests (routes with test DB)
├── main.py              ← FastAPI app entrypoint
├── requirements.txt     ← Production dependencies
├── requirements-dev.txt ← Dev/test dependencies
└── .env.example         ← Environment variable template
```

## Setup

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env  # fill in credentials
alembic upgrade head
uvicorn main:app --reload
```

## Key Conventions

- Routes are in `api/routes/` — one file per resource (`trains.py`, `stations.py`, etc.)
- Routes call controllers, never services directly
- Services call repositories, never the DB directly
- All DB access is async (SQLAlchemy AsyncSession)
- Configuration via `config/settings.py` (pydantic-settings, reads from `.env`)

## Running Tests

```bash
pytest tests/ -v
```
