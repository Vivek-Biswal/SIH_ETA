"""
ETA Contract Module
===================
Defines the standard input and output data structures for ETA requests and predictions.
No ML is performed here — these are plain data containers with validation.
"""
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime


@dataclass
class ETARequest:
    """
    Standard input contract for an ETA prediction request.

    CURRENTLY SUPPORTED:
        train_number, destination_station, current_delay_minutes (optional)

    FUTURE REQUIRED (not currently available):
        current_station, prediction_timestamp, route_position
    """
    train_number: str
    destination_station: str

    # Optional — if provided, enables DELAY_ADJUSTED_BASELINE
    current_delay_minutes: Optional[float] = None

    # Optional — the station the train is currently at or last departed from
    # Currently unavailable in real-time; must be manually supplied
    current_station: Optional[str] = None

    # Optional — when the prediction is being requested
    # Defaults to None (system will use schedule day offsets only)
    prediction_timestamp: Optional[datetime] = None


@dataclass
class ETAPrediction:
    """
    Standard output schema for all ETA baseline predictions.
    All baselines must return this structure.
    """
    train_number: str
    destination_station: str

    # The scheduled arrival from the timetable (always populated if route is valid)
    scheduled_arrival: Optional[str] = None  # Format: "HH:MM:SS", day offset in notes
    scheduled_day: Optional[float] = None    # Day number from journey start (1.0, 2.0, etc.)

    # The estimated arrival (populated by baseline logic)
    predicted_arrival: Optional[str] = None
    predicted_day: Optional[float] = None

    # The delay applied (if DELAY_ADJUSTED_BASELINE used)
    current_delay_minutes: Optional[float] = None

    # Which baseline was used
    prediction_method: str = "UNKNOWN"

    # Human-readable status
    status: str = "OK"        # OK | ERROR | MISSING_SCHEDULE | INVALID_DESTINATION

    # List of assumptions made by the baseline
    assumptions: list = field(default_factory=list)

    # Any warning or error messages
    message: Optional[str] = None
