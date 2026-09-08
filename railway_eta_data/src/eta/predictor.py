"""
ETA Predictor Interface
========================
Unified entry point for all ETA baseline predictions.

Automatically selects the appropriate baseline based on available inputs:
    - If current_delay_minutes is provided: DELAY_ADJUSTED_BASELINE
    - Otherwise: SCHEDULE_BASELINE

The prediction_method field in the output always identifies which
baseline was used. It is never hidden.
"""
from typing import Dict, List, Optional
from datetime import datetime
from .contract import ETARequest, ETAPrediction
from .schedule_baseline import schedule_baseline
from .delay_baseline import delay_adjusted_baseline


def predict_eta(
    train_number: str,
    destination_station: str,
    journeys_lookup: Dict[str, List[Dict]],
    current_delay_minutes: Optional[float] = None,
    current_station: Optional[str] = None,
    prediction_timestamp: Optional[datetime] = None,
) -> ETAPrediction:
    """
    Unified ETA prediction interface.

    Selects the appropriate baseline automatically:
        - DELAY_ADJUSTED_BASELINE if current_delay_minutes is provided
        - SCHEDULE_BASELINE otherwise

    Args:
        train_number:           The train number to predict for
        destination_station:    The target station code (e.g. "NDLS")
        journeys_lookup:        Dict of {train_number: journey_route}
        current_delay_minutes:  Live delay in minutes (optional)
        current_station:        The station the train is currently at (optional)
        prediction_timestamp:   When the prediction is being made (optional)

    Returns:
        ETAPrediction with all fields populated, including prediction_method.
    """
    request = ETARequest(
        train_number=train_number,
        destination_station=destination_station,
        current_delay_minutes=current_delay_minutes,
        current_station=current_station,
        prediction_timestamp=prediction_timestamp,
    )

    if current_delay_minutes is not None:
        return delay_adjusted_baseline(request, journeys_lookup)
    else:
        return schedule_baseline(request, journeys_lookup)


def build_journeys_lookup(journeys_list: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Converts the flat journeys list into a lookup dict keyed by train_number.
    This is the expected format for journeys_scheduled.json.

    Args:
        journeys_list: List of journey dicts (each has 'train_number' and 'journey_route')

    Returns:
        Dict[train_number_str -> journey_route list]
    """
    lookup = {}
    for journey in journeys_list:
        key = str(journey.get("train_number", "")).strip()
        if key:
            lookup[key] = journey.get("journey_route", [])
    return lookup
