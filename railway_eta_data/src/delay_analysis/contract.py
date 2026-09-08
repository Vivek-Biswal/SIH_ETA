"""
Delay-DNA Data Contract
=======================
Defines the structured data types for delay analysis in the SIH Indian Train
ETA Project. Explicitly separates observed, aggregated, and unavailable data.
"""
from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class DelayObservation:
    """
    A single observed delay record from a live or snapshot dataset.
    This is OBSERVED_CURRENT level data — NOT historical.
    """
    train_number: str
    delay_minutes: Optional[float]        # None if missing/unavailable
    cancelled: Optional[bool]
    snapshot_timestamp: Optional[str]     # ISO string, represents when observed

    # Derived analytical category (set by analyzer)
    delay_category: Optional[str] = None  # "low", "moderate", "high", "severe"


@dataclass
class HistoricalStationContext:
    """
    Aggregated historical statistics for a station from DA323.
    This is HISTORICAL_AGGREGATED level — temporal provenance is UNKNOWN.
    """
    station_code: str
    avg_delay_minutes: Optional[float]
    percent_right_time: Optional[float]
    percent_significant_delay: Optional[float]

    # Explicit temporal status flag
    temporal_status: str = "TEMPORALLY_UNKNOWN"


@dataclass
class DelayDNAProfile:
    """
    A structured Delay-DNA profile for a train at a given context.

    Explicitly tracks the category and completeness of every field.

    NOT usable for ML training without verified time-aligned historical labels.
    """
    train_number: str

    # --- A. OBSERVED CURRENT DELAY ---
    current_delay_minutes: Optional[float] = None
    snapshot_timestamp: Optional[str] = None
    delay_category: Optional[str] = None
    # Availability label
    current_delay_status: str = "NOT_AVAILABLE"   # OBSERVED_CURRENT | NOT_AVAILABLE

    # --- B. HISTORICAL AGGREGATED CONTEXT ---
    historical_avg_delay: Optional[float] = None
    historical_pct_right_time: Optional[float] = None
    historical_pct_significant_delay: Optional[float] = None
    # Availability label
    historical_context_status: str = "NOT_AVAILABLE"  # HISTORICAL_AGGREGATED | NOT_AVAILABLE

    # --- C. STATIC ROUTE CONTEXT ---
    route_distance: Optional[float] = None
    stop_count: Optional[int] = None
    scheduled_duration_hours: Optional[float] = None
    train_type: Optional[str] = None
    # Availability label
    route_context_status: str = "NOT_AVAILABLE"   # STATIC_CONTEXT | NOT_AVAILABLE

    # --- D. UNAVAILABLE DYNAMIC FIELDS ---
    # These cannot be fabricated; documented here for completeness
    actual_arrival_time: Optional[str] = None          # FUTURE_REQUIRED
    historical_trajectory: Optional[List] = None       # NOT_AVAILABLE

    # --- Profile Metadata ---
    data_completeness_note: str = (
        "This profile does not support ML training. "
        "Actual arrival labels and time-aligned trajectory observations are missing."
    )
    limitations: List[str] = field(default_factory=lambda: [
        "current_delay is a single snapshot, not a time series",
        "historical_avg_delay has unknown temporal provenance (DA323)",
        "actual_arrival_time is unavailable — blocks ML target creation",
        "historical_trajectory is unavailable — blocks recovery measurement"
    ])
