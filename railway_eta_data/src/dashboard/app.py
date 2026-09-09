"""
Local Development Data Inspection Dashboard — FastAPI Application
=================================================================
Read-only API endpoints for inspecting the SIH ETA project processed datasets
and for demonstrating the deterministic ETA prediction pipeline.

IMPORTANT CONSTRAINTS:
- All endpoints are READ-ONLY. No data is ever created, modified, or deleted.
- No synthetic or generated data is ever returned. If data is not available, 
  the response will contain "DATA NOT AVAILABLE" or status "NOT_FOUND".
- The ETA system is a deterministic baseline. It is NOT an ML model.
  This is stated explicitly in every /api/data/summary response.

Run with:
    python -m uvicorn src.dashboard.app:app --reload --host 127.0.0.1 --port 8000
"""
import os
import sys
from typing import Optional
from datetime import datetime

_HERE = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(os.path.dirname(_HERE))
sys.path.insert(0, _PROJECT_ROOT)

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import src.dashboard.service as svc


# ─────────────────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────────────────
app = FastAPI(
    title="SIH ETA — Local Inspection Dashboard",
    description=(
        "READ-ONLY data inspection dashboard for the SIH Indian Train ETA project. "
        "Exposes processed datasets and the deterministic ETA baseline. "
        "NOT a production API. NOT an ML model."
    ),
    version="1.0.0-local",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────
# Static file serving
# ─────────────────────────────────────────────────────────
_STATIC_DIR = os.path.join(_HERE, "static")
app.mount("/static", StaticFiles(directory=_STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def serve_index():
    return FileResponse(os.path.join(_STATIC_DIR, "index.html"))


# ─────────────────────────────────────────────────────────
# Startup: pre-load datasets
# ─────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Pre-load all datasets on server startup so the first request is fast."""
    try:
        svc._ensure_loaded()
    except Exception as e:
        print(f"[Dashboard] STARTUP ERROR: {e}")


# ─────────────────────────────────────────────────────────
# API Routes
# ─────────────────────────────────────────────────────────

@app.get("/api/health", tags=["System"])
def health():
    """Health check endpoint — verifies server is running and datasets are loaded."""
    return {
        "status": "ok",
        "server": "SIH ETA Local Inspection Dashboard",
        "datasets_loaded": svc.is_loaded(),
        "loaded_at": svc.get_loaded_at() or "NOT_LOADED_YET",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "note": "This is a local development tool. NOT a production API.",
    }


@app.get("/api/data/summary", tags=["Data"])
def data_summary():
    """
    Returns a comprehensive summary of all processed datasets including:
    - Record counts and file sizes
    - Schema fields
    - DA323 temporal safety warning
    - System disclaimer (deterministic baseline, not ML)
    """
    try:
        return svc.get_data_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load data summary: {str(e)}")


@app.get("/api/stations", tags=["Data"])
def stations(
    limit: int = Query(default=50, ge=1, le=200, description="Number of records to return"),
    offset: int = Query(default=0, ge=0, description="Record offset for pagination"),
    query: str = Query(default="", description="Filter by station code or name (case-insensitive)")
):
    """
    Paginated list of all stations from stations_clean.json.
    Use 'query' to search by code or name. Max 200 records per page.
    """
    try:
        return svc.get_stations(limit=limit, offset=offset, query=query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/trains", tags=["Data"])
def trains(
    limit: int = Query(default=50, ge=1, le=200, description="Number of records to return"),
    offset: int = Query(default=0, ge=0, description="Record offset for pagination"),
    query: str = Query(default="", description="Filter by train number or name")
):
    """
    Paginated list of all trains from trains_clean.json.
    Use 'query' to search by number or train name.
    """
    try:
        return svc.get_trains(limit=limit, offset=offset, query=query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/schedules/{train_number}", tags=["Data"])
def schedule(train_number: str):
    """
    Returns the complete ordered stop schedule for the given train number.
    Source: journeys_scheduled.json
    Returns NOT_FOUND status (not an HTTP 404) if the train has no journey record.
    """
    try:
        return svc.get_train_schedule(train_number)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/delays", tags=["Data"])
def delays(
    limit: int = Query(default=50, ge=1, le=200, description="Number of records to return"),
    offset: int = Query(default=0, ge=0, description="Record offset for pagination")
):
    """
    Paginated sample of cleaned delay records from delays_clean.json.
    Read-only. Source: delays_clean.json.
    """
    try:
        return svc.get_delays(limit=limit, offset=offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────
# ETA Prediction
# ─────────────────────────────────────────────────────────

class ETARequest(BaseModel):
    train_number: str
    destination_station: str
    current_delay_minutes: Optional[float] = None

    class Config:
        json_schema_extra = {
            "example": {
                "train_number": "12001",
                "destination_station": "NDLS",
                "current_delay_minutes": 45.0
            }
        }


@app.post("/api/eta/predict", tags=["ETA"])
def eta_predict(request: ETARequest):
    """
    Run the deterministic ETA baseline for a given train and destination.

    IMPORTANT:
    - This is a deterministic calculation using scheduled data — NOT an ML model.
    - If current_delay_minutes is provided: uses DELAY_ADJUSTED_BASELINE.
    - If not provided: uses SCHEDULE_BASELINE.
    - All assumptions and limitations are returned in the response.
    - The response includes 'prediction_method' and 'data_completeness_status' for full auditability.
    """
    try:
        result = svc.predict_eta(
            train_number=request.train_number,
            destination_station=request.destination_station,
            current_delay_minutes=request.current_delay_minutes
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ETA prediction failed: {str(e)}")
