# LOCAL_RUN.md — SIH ETA Inspection Dashboard

A local development data inspection dashboard to verify the processed Indian Railways
datasets and the deterministic ETA prediction pipeline.

> **This is a local development tool only.**  
> It is read-only and does not modify any datasets.  
> The ETA system uses deterministic baselines — it is **NOT** a supervised ML model.

---

## Prerequisites

- Python 3.10 or later
- The `.venv` virtual environment (already present in `railway_eta_data/`)
- All processed datasets already generated in `data/processed/`

---

## One-Time Setup (Install Dependencies)

Open **PowerShell** and run from the `railway_eta_data` folder:

```powershell
# Navigate to the project data directory
cd "C:\Users\Lenovo\OneDrive\Desktop\GitHub\SIH_ETA\railway_eta_data"

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# Install dashboard dependencies (FastAPI + Uvicorn)
pip install fastapi "uvicorn[standard]" python-multipart
```

> **Note:** If you see a PowerShell execution policy error, run:  
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

---

## Run the Dashboard

From `railway_eta_data/`, with the venv active:

```powershell
python -m uvicorn src.dashboard.app:app --host 127.0.0.1 --port 8000 --reload
```

### Expected startup output:

```
[Dashboard] Loading datasets into memory (this happens once)...
[Dashboard] Loaded: XXXX trains, XXXX stations, XXXXX schedule records, XX delay records.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

> ⏳ **First startup takes 5–30 seconds** to load the large JSON files
> (schedules: ~82 MB, journeys: ~74 MB) into memory.
> Subsequent API requests are served instantly from cache.

---

## Access URLs

| URL | Description |
|:----|:-----------|
| `http://127.0.0.1:8000/` | **Main UI Dashboard** ← Open this |
| `http://127.0.0.1:8000/docs` | Swagger API Documentation (interactive) |
| `http://127.0.0.1:8000/redoc` | ReDoc API Documentation |

---

## API Endpoints Reference

All endpoints are **read-only**. No data is ever modified.

### Health
```
GET  /api/health
```

### Data Summary
```
GET  /api/data/summary
```
Returns record counts, file sizes, schema fields, DA323 temporal safety warning, and system disclaimer.

### Stations (paginated + searchable)
```
GET  /api/stations?limit=50&offset=0&query=NDLS
```

### Trains (paginated + searchable)
```
GET  /api/trains?limit=50&offset=0&query=12001
GET  /api/trains?limit=50&offset=0&query=Rajdhani
```

### Train Schedule
```
GET  /api/schedules/12001
GET  /api/schedules/12951
```

### Delay Records (paginated)
```
GET  /api/delays?limit=50&offset=0
```

### ETA Prediction
```
POST /api/eta/predict
Content-Type: application/json

{
  "train_number": "12001",
  "destination_station": "NDLS",
  "current_delay_minutes": 45.0
}
```

---

## PowerShell Quick Test Commands

After the server is running, open a **second** PowerShell window:

```powershell
# Health check
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" | ConvertTo-Json

# Data summary
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/data/summary" | ConvertTo-Json -Depth 3

# Search for station 'NDLS'
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/stations?query=NDLS" | ConvertTo-Json

# Get schedule for train 12001
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/schedules/12001" | ConvertTo-Json -Depth 4

# ETA prediction (Schedule-only baseline, no delay)
$body = '{"train_number": "12001", "destination_station": "NDLS"}'
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/eta/predict" `
  -Method POST -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 4

# ETA prediction (Delay-adjusted baseline, 45 min delay)
$body = '{"train_number": "12001", "destination_station": "NDLS", "current_delay_minutes": 45.0}'
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/eta/predict" `
  -Method POST -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 4

# Test invalid train (should return status ERROR, error_code INVALID_REQUEST)
$body = '{"train_number": "99999", "destination_station": "NDLS"}'
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/eta/predict" `
  -Method POST -ContentType "application/json" -Body $body | ConvertTo-Json
```

---

## Stop the Server

Press `Ctrl+C` in the terminal running uvicorn.

---

## Troubleshooting

| Problem | Solution |
|:--------|:---------|
| `ModuleNotFoundError: No module named 'fastapi'` | Run: `pip install fastapi "uvicorn[standard]"` |
| `ModuleNotFoundError: No module named 'src'` | Ensure you run from `railway_eta_data/` (not from `src/`) |
| `FileNotFoundError: ... data/processed/...` | Run the data pipeline first: `python src/run_cleaning.py` then `python src/run_journey_reconstruction.py` |
| Port 8000 already in use | Use a different port: `--port 8001` |
| PowerShell execution policy error | `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| Slow first load (30+ seconds) | Expected — loading ~150 MB of JSON from disk. Subsequent requests are instant. |

---

## Architecture Notes

- **Backend**: FastAPI + Uvicorn, running on `127.0.0.1:8000`
- **Frontend**: Vanilla HTML/CSS/JS served as static files from `src/dashboard/static/`
- **Data Loading**: All datasets loaded once on server startup into in-memory dictionaries
- **ETA Engine**: `ETAOrchestrator` from `src/system/orchestrator.py` — deterministic, no ML
- **DA323 Exclusion**: The `public_historical_delay_clean.csv` dataset is loaded for display only. It is **excluded from ETA calculations** due to unknown temporal provenance (DA323 temporal safety rule).
