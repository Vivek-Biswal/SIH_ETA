# Etaernal passenger API

FastAPI service shared by the website and Flutter application. It adapts
RailRadar reports, serves the trained three-train ETA pilot with explicit
fallbacks, creates station-specific explanations and supplies arrival weather
and dated network insights.

- [Complete setup](../docs/development/setup.md)
- [Current architecture](../docs/architecture/system-architecture.md)
- [API guide and compatibility boundaries](../docs/api/api-contract.md)
- [Training and inference audit](../docs/ETA_ML_AUDIT.md)

Run **from this directory**:

```bash
python -m venv .venv
# Activate .venv, then:
python -m pip install -r requirements.txt
cp .env.example .env
python -m uvicorn main:app --reload --port 8000
```

Configure `RAILRADAR_API_KEY` for provider-backed data. OpenWeather and Supabase
are optional; no PostgreSQL/Redis containers or Alembic migration are required
by the current startup path. Without a real source, passenger information may
be unavailable—sample compatibility endpoints are not live data.

Open `/health`, `/docs` or `/api/v1/eta/model`. The versioned model/evaluation
under `data/eta_ml/` is checked in and does not require scikit-learn at runtime.
Private keys remain server-side.

```bash
python -m pip install -r requirements-test.txt
python -m pytest tests/ -q
```

Run tests with provider credentials unset so tests cannot spend live allocations.
The test suite uses controlled responses, not real railway requests.
