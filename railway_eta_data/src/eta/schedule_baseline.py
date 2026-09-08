"""
Schedule Baseline Module
=========================
Implements the SCHEDULE_BASELINE ETA method.

Logic:
    Given a train number and destination station, retrieve the scheduled
    arrival time directly from the reconstructed journey timetable.

What this baseline answers:
    "When is the train SCHEDULED to arrive at the destination?"

What this baseline does NOT claim:
    "When will the train ACTUALLY arrive?"

Scientific Constraints:
    - The schedule is a static plan, not a real-time observation.
    - This baseline ignores all current conditions (delays, speed, position).
    - Scheduled arrival is NOT ground truth for evaluating ETA accuracy.
"""
from typing import Dict, List, Optional
from .contract import ETARequest, ETAPrediction
from .validators import (
    validate_train_number,
    validate_destination_in_route,
    validate_destination_after_current,
    ETAValidationError,
)


def time_str_to_minutes(time_str: Optional[str]) -> Optional[int]:
    """
    Converts HH:MM:SS (or HH:MM) to total minutes from midnight.
    Returns None if time is missing or unparseable.
    Handles times >= 24:00 (cross-midnight or day-offset times).
    """
    if time_str is None or str(time_str).strip() in ("None", "", "nan"):
        return None
    try:
        parts = str(time_str).strip().split(":")
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = int(parts[2]) if len(parts) > 2 else 0
        return hours * 60 + minutes + (seconds // 60)
    except (ValueError, IndexError):
        return None


def add_delay_to_time(time_str: str, delay_minutes: float) -> str:
    """
    Adds delay_minutes to a HH:MM:SS time string and returns updated time.
    Correctly handles overflow past midnight (returns times like 25:30:00
    to preserve day context — the day field tracks the calendar day).
    """
    total_mins = time_str_to_minutes(time_str)
    if total_mins is None:
        return time_str  # Cannot adjust; return original unchanged

    new_total = total_mins + int(delay_minutes)
    # Preserve full hours including overflow (intentionally not wrapping at 24h)
    # because day offsets are tracked separately in the journey schema.
    hh = new_total // 60
    mm = new_total % 60
    return f"{hh:02d}:{mm:02d}:00"


def schedule_baseline(
    request: ETARequest,
    journeys_lookup: Dict[str, List[Dict]]
) -> ETAPrediction:
    """
    SCHEDULE_BASELINE: Returns the scheduled arrival time at the destination.

    Args:
        request: ETARequest with train_number and destination_station
        journeys_lookup: dict mapping train_number -> journey_route (list of stops)

    Returns:
        ETAPrediction with prediction_method = "SCHEDULE_BASELINE"
    """
    try:
        train_num = validate_train_number(request.train_number)
    except ETAValidationError as e:
        return ETAPrediction(
            train_number=request.train_number,
            destination_station=request.destination_station,
            prediction_method="SCHEDULE_BASELINE",
            status="ERROR",
            message=str(e)
        )

    if train_num not in journeys_lookup:
        return ETAPrediction(
            train_number=train_num,
            destination_station=request.destination_station,
            prediction_method="SCHEDULE_BASELINE",
            status="ERROR",
            message=f"Train '{train_num}' not found in reconstructed journeys."
        )

    journey_route = journeys_lookup[train_num]

    # Validate destination exists in route
    try:
        dest_stop = validate_destination_in_route(request.destination_station, journey_route)
    except ETAValidationError as e:
        return ETAPrediction(
            train_number=train_num,
            destination_station=request.destination_station,
            prediction_method="SCHEDULE_BASELINE",
            status="INVALID_DESTINATION",
            message=str(e)
        )

    # Validate ordering if current_station is provided
    try:
        validate_destination_after_current(
            request.current_station,
            request.destination_station,
            journey_route
        )
    except ETAValidationError as e:
        return ETAPrediction(
            train_number=train_num,
            destination_station=request.destination_station,
            prediction_method="SCHEDULE_BASELINE",
            status="ERROR",
            message=str(e)
        )

    sched_arrival = dest_stop.get("scheduled_arrival")
    sched_day = dest_stop.get("day")

    # If arrival is None (e.g. destination is a terminal with only departure)
    # fall back to departure time
    if sched_arrival is None or str(sched_arrival).strip() in ("None", "", "nan"):
        sched_arrival = dest_stop.get("scheduled_departure")

    if sched_arrival is None or str(sched_arrival).strip() in ("None", "", "nan"):
        return ETAPrediction(
            train_number=train_num,
            destination_station=request.destination_station,
            scheduled_day=sched_day,
            prediction_method="SCHEDULE_BASELINE",
            status="MISSING_SCHEDULE",
            message=(
                f"No scheduled arrival or departure time available for "
                f"'{request.destination_station}' on train '{train_num}'."
            )
        )

    return ETAPrediction(
        train_number=train_num,
        destination_station=request.destination_station,
        scheduled_arrival=sched_arrival,
        scheduled_day=sched_day,
        predicted_arrival=sched_arrival,  # For schedule baseline, predicted = scheduled
        predicted_day=sched_day,
        current_delay_minutes=None,
        prediction_method="SCHEDULE_BASELINE",
        status="OK",
        assumptions=[
            "The reconstructed timetable is assumed to be the planned route.",
            "No real-time train state is considered.",
            "This estimate does not account for current delays or disruptions.",
        ]
    )
