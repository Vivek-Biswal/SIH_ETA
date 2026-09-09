"""
Dashboard Service
=================
Responsible for loading and caching all processed datasets from disk
and exposing an initialized ETAOrchestrator instance.

DESIGN PRINCIPLES:
- Datasets are loaded ONCE on first access (lazy singleton pattern).
- All access is read-only — no dataset is ever modified.
- Missing or unreadable files raise descriptive errors rather than returning synthetic data.
- The ETA system is a deterministic baseline, NOT an ML model. This is stated explicitly
  in every dataset summary response.
"""
import os
import json
import csv
import sys
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

# ─────────────────────────────────────────────────────────
# Path bootstrap: allow running from any working directory
# ─────────────────────────────────────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
_SRC_DIR = os.path.dirname(_HERE)                      # .../src
_PROJECT_ROOT = os.path.dirname(_SRC_DIR)              # .../railway_eta_data
sys.path.insert(0, _PROJECT_ROOT)

from src.config import PROCESSED_DATA_DIR
from src.system.orchestrator import ETAOrchestrator
from src.state.builder import TrainStateBuilder
from src.eta.predictor import build_journeys_lookup


# ─────────────────────────────────────────────────────────
# Internal constants
# ─────────────────────────────────────────────────────────
_DATA_FILES = {
    "trains":               "trains_clean.json",
    "stations":             "stations_clean.json",
    "schedules":            "schedules_clean.json",
    "journeys":             "journeys_scheduled.json",
    "delays":               "delays_clean.json",
    "public_historical":    "public_historical_delay_clean.csv",
    "decision_log":         "decision_log.csv",
}


# ─────────────────────────────────────────────────────────
# Singleton cache
# ─────────────────────────────────────────────────────────
_cache: Dict[str, Any] = {}
_LOADED = False


def _load_json(filename: str) -> List[Dict[str, Any]]:
    path = os.path.join(PROCESSED_DATA_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Expected processed data file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_csv(filename: str) -> List[Dict[str, Any]]:
    path = os.path.join(PROCESSED_DATA_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Expected processed data file not found: {path}")
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(dict(row))
    return rows


def _file_size_mb(filename: str) -> Optional[float]:
    path = os.path.join(PROCESSED_DATA_DIR, filename)
    if not os.path.exists(path):
        return None
    return round(os.path.getsize(path) / (1024 * 1024), 2)


def _list_to_dict(lst: List[Dict[str, Any]], key: str) -> Dict[str, Dict[str, Any]]:
    return {str(item.get(key, "")).strip(): item for item in lst if item.get(key)}


def _ensure_loaded():
    """Load all datasets into cache on first call. Idempotent."""
    global _LOADED
    if _LOADED:
        return

    print("[Dashboard] Loading datasets into memory (this happens once)...")

    raw_trains = _load_json(_DATA_FILES["trains"])
    raw_stations = _load_json(_DATA_FILES["stations"])
    raw_schedules = _load_json(_DATA_FILES["schedules"])
    raw_journeys = _load_json(_DATA_FILES["journeys"])
    raw_delays = _load_json(_DATA_FILES["delays"])

    # CSV files
    raw_public_historical = _load_csv(_DATA_FILES["public_historical"])
    raw_decision_log = _load_csv(_DATA_FILES["decision_log"])

    # Build fast lookup dictionaries
    trains_lookup = _list_to_dict(raw_trains, "number")
    stations_lookup = _list_to_dict(raw_stations, "code")
    schedules_lookup = _list_to_dict(raw_schedules, "train_number") if raw_schedules and isinstance(raw_schedules[0], dict) and "train_number" in raw_schedules[0] else {}
    journeys_lookup = build_journeys_lookup(raw_journeys)

    # Build ETAOrchestrator
    builder = TrainStateBuilder(
        trains_lookup=trains_lookup,
        journeys_lookup=journeys_lookup,
        historical_lookup={},   # DA323 is temporally unsafe — excluded deliberately
        live_delays_lookup={}   # Delay injected per-request via current_delay_minutes
    )
    orchestrator = ETAOrchestrator(state_builder=builder, journeys_lookup=journeys_lookup)

    _cache["trains"] = raw_trains
    _cache["trains_lookup"] = trains_lookup
    _cache["stations"] = raw_stations
    _cache["stations_lookup"] = stations_lookup
    _cache["schedules"] = raw_schedules
    _cache["schedules_lookup"] = schedules_lookup
    _cache["journeys_lookup"] = journeys_lookup
    _cache["delays"] = raw_delays
    _cache["public_historical"] = raw_public_historical
    _cache["decision_log"] = raw_decision_log
    _cache["orchestrator"] = orchestrator
    _cache["loaded_at"] = datetime.utcnow().isoformat() + "Z"

    _LOADED = True
    print(f"[Dashboard] Loaded: {len(raw_trains)} trains, {len(raw_stations)} stations, "
          f"{len(raw_schedules)} schedule records, {len(raw_delays)} delay records.")


# ─────────────────────────────────────────────────────────
# Public API used by app.py
# ─────────────────────────────────────────────────────────

def get_data_summary() -> Dict[str, Any]:
    """Return overview counts, file sizes, schema summaries, and system disclaimer."""
    _ensure_loaded()

    def _fields(lst: List[Dict]) -> List[str]:
        return list(lst[0].keys()) if lst else []

    return {
        "disclaimer": (
            "The current ETA system uses deterministic baselines and is NOT a supervised ML model. "
            "Predictions are computed from static scheduled data and optionally provided current delay. "
            "No historical training data is used for ETA generation."
        ),
        "datasets": {
            "trains": {
                "record_count": len(_cache["trains"]),
                "file_size_mb": _file_size_mb(_DATA_FILES["trains"]),
                "source_file": _DATA_FILES["trains"],
                "schema_fields": _fields(_cache["trains"]),
                "status": "AVAILABLE"
            },
            "stations": {
                "record_count": len(_cache["stations"]),
                "file_size_mb": _file_size_mb(_DATA_FILES["stations"]),
                "source_file": _DATA_FILES["stations"],
                "schema_fields": _fields(_cache["stations"]),
                "status": "AVAILABLE"
            },
            "schedules": {
                "record_count": len(_cache["schedules"]),
                "file_size_mb": _file_size_mb(_DATA_FILES["schedules"]),
                "source_file": _DATA_FILES["schedules"],
                "schema_fields": _fields(_cache["schedules"]),
                "status": "AVAILABLE"
            },
            "journeys": {
                "train_count": len(_cache["journeys_lookup"]),
                "file_size_mb": _file_size_mb(_DATA_FILES["journeys"]),
                "source_file": _DATA_FILES["journeys"],
                "status": "AVAILABLE",
                "note": "Grouped journey schedules (one list of stops per train)."
            },
            "delays": {
                "record_count": len(_cache["delays"]),
                "file_size_mb": _file_size_mb(_DATA_FILES["delays"]),
                "source_file": _DATA_FILES["delays"],
                "schema_fields": _fields(_cache["delays"]),
                "status": "AVAILABLE"
            },
            "public_historical_delay": {
                "record_count": len(_cache["public_historical"]),
                "file_size_mb": _file_size_mb(_DATA_FILES["public_historical"]),
                "source_file": _DATA_FILES["public_historical"],
                "schema_fields": _fields(_cache["public_historical"]),
                "status": "AVAILABLE",
                "temporal_safety_warning": (
                    "DA323: This dataset's time provenance is unknown (scrape timestamp is missing). "
                    "It is excluded from ETA calculations to prevent stale-data contamination."
                )
            },
            "decision_log": {
                "record_count": len(_cache["decision_log"]),
                "file_size_mb": _file_size_mb(_DATA_FILES["decision_log"]),
                "source_file": _DATA_FILES["decision_log"],
                "schema_fields": _fields(_cache["decision_log"]),
                "status": "AVAILABLE"
            },
        },
        "loaded_at": _cache.get("loaded_at", "NOT_LOADED")
    }


def get_stations(limit: int = 50, offset: int = 0, query: str = "") -> Dict[str, Any]:
    _ensure_loaded()
    data = _cache["stations"]
    if query:
        q = query.strip().upper()
        data = [
            s for s in data
            if q in str(s.get("code", "")).upper() or q in str(s.get("name", "")).upper()
        ]
    total = len(data)
    page = data[offset: offset + limit]
    return {"total": total, "limit": limit, "offset": offset, "results": page}


def get_trains(limit: int = 50, offset: int = 0, query: str = "") -> Dict[str, Any]:
    _ensure_loaded()
    data = _cache["trains"]
    if query:
        q = query.strip()
        data = [
            t for t in data
            if q in str(t.get("number", "")) or q.upper() in str(t.get("name", "")).upper()
        ]
    total = len(data)
    page = data[offset: offset + limit]
    return {"total": total, "limit": limit, "offset": offset, "results": page}


def get_train_schedule(train_number: str) -> Dict[str, Any]:
    _ensure_loaded()
    train_number = str(train_number).strip()
    stops = _cache["journeys_lookup"].get(train_number)
    if stops is None:
        return {"status": "NOT_FOUND", "train_number": train_number, "stops": []}
    train_meta = _cache["trains_lookup"].get(train_number, {})
    return {
        "status": "FOUND",
        "train_number": train_number,
        "train_name": train_meta.get("name", "DATA NOT AVAILABLE"),
        "train_type": train_meta.get("type_canonical") or train_meta.get("type", "DATA NOT AVAILABLE"),
        "stop_count": len(stops),
        "stops": stops
    }


def get_delays(limit: int = 50, offset: int = 0) -> Dict[str, Any]:
    _ensure_loaded()
    data = _cache["delays"]
    total = len(data)
    page = data[offset: offset + limit]
    return {"total": total, "limit": limit, "offset": offset, "results": page}


def predict_eta(train_number: str, destination_station: str,
                current_delay_minutes: Optional[float] = None) -> Dict[str, Any]:
    _ensure_loaded()
    request_dict = {
        "train_number": str(train_number).strip(),
        "destination_station": str(destination_station).strip().upper(),
        "request_timestamp": datetime.utcnow().isoformat() + "Z",
    }
    if current_delay_minutes is not None:
        request_dict["current_delay_minutes"] = float(current_delay_minutes)
    return _cache["orchestrator"].process_request(request_dict)


def is_loaded() -> bool:
    return _LOADED


def get_loaded_at() -> Optional[str]:
    return _cache.get("loaded_at")
