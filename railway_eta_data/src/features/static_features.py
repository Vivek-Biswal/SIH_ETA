"""
Static Features Module
======================
Extracts train-level static features like distance, type, duration.
"""
from typing import Dict, Any, Optional

def get_static_train_features(train_number: str, trains_lookup: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Returns static features for a train.
    """
    train_record = trains_lookup.get(str(train_number).strip())
    if not train_record:
        return {
            "train_type": None,
            "route_distance": None,
            "scheduled_duration_hours": None
        }
        
    try:
        dist = float(train_record.get("distance", 0))
    except (TypeError, ValueError):
        dist = None
        
    try:
        dur_h = float(train_record.get("duration_h", 0))
        dur_m = float(train_record.get("duration_m", 0))
        duration = dur_h + (dur_m / 60.0)
    except (TypeError, ValueError):
        duration = None
        
    return {
        "train_type": str(train_record.get("type", "")) if train_record.get("type") else None,
        "route_distance": dist if dist and dist > 0 else None,
        "scheduled_duration_hours": duration if duration and duration > 0 else None
    }

def get_station_context(station_code: str, stations_lookup: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Returns static geographic features for a station.
    """
    station_record = stations_lookup.get(str(station_code).strip().upper())
    if not station_record:
        return {
            "state": None,
            "zone": None
        }
        
    return {
        "state": str(station_record.get("state", "")) if station_record.get("state") else None,
        "zone": str(station_record.get("zone", "")) if station_record.get("zone") else None,
    }
