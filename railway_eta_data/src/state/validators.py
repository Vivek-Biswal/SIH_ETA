"""
State Validation Module
=======================
Input validation for TrainState.
"""
from typing import List, Dict, Any

class StateValidationError(ValueError):
    pass

def validate_train_number(value: str) -> str:
    v = str(value).strip()
    if not v:
        raise StateValidationError("train_number must not be empty.")
    return v

def validate_destination(destination_station: str, journey: List[Dict[str, Any]]):
    """
    Validates that the destination exists in the scheduled journey.
    """
    if not destination_station:
        raise StateValidationError("destination_station must not be empty.")
        
    journey_stations = [s.get("station", "").upper() for s in journey]
    if destination_station.upper() not in journey_stations:
        raise StateValidationError(f"Destination {destination_station} not found in scheduled route.")
