"""
ETA Validators Module
======================
Input validation for ETA prediction requests.
Validates train number, route existence, destination reachability,
delay values, and time formats.
"""
from typing import Optional, List, Dict


class ETAValidationError(Exception):
    """Raised when ETA input validation fails."""
    pass


def validate_train_number(train_number: str) -> str:
    """Validates and normalises the train number."""
    if not train_number or not str(train_number).strip():
        raise ETAValidationError("train_number must not be empty.")
    return str(train_number).strip()


def validate_destination_in_route(
    destination_station: str,
    journey_route: List[Dict]
) -> Dict:
    """
    Checks that the destination station exists in the journey route.
    Returns the matching stop record.
    """
    dest = destination_station.strip().upper()
    for stop in journey_route:
        code = str(stop.get("station", "")).strip().upper()
        if code == dest:
            return stop
    raise ETAValidationError(
        f"Destination '{destination_station}' not found in this train's route."
    )


def validate_destination_after_current(
    current_station: Optional[str],
    destination_station: str,
    journey_route: List[Dict]
) -> None:
    """
    Checks that the destination occurs after the current station in the route.
    Raises ETAValidationError if destination is before (or the same as) current.
    Skips check if current_station is None.
    """
    if current_station is None:
        return  # Cannot verify ordering without known current position

    curr = current_station.strip().upper()
    dest = destination_station.strip().upper()

    curr_seq = None
    dest_seq = None

    for stop in journey_route:
        code = str(stop.get("station", "")).strip().upper()
        seq = stop.get("sequence", 0)
        if code == curr:
            curr_seq = seq
        if code == dest:
            dest_seq = seq

    if curr_seq is None:
        raise ETAValidationError(
            f"Current station '{current_station}' not found in this train's route."
        )
    if dest_seq is None:
        raise ETAValidationError(
            f"Destination '{destination_station}' not found in this train's route."
        )
    if dest_seq <= curr_seq:
        raise ETAValidationError(
            f"Destination '{destination_station}' (seq={dest_seq}) does not come "
            f"after current station '{current_station}' (seq={curr_seq})."
        )


def validate_delay(delay: Optional[float]) -> Optional[float]:
    """Validates a delay value (minutes). Must be numeric and not outrageously large."""
    if delay is None:
        return None
    try:
        delay = float(delay)
    except (TypeError, ValueError):
        raise ETAValidationError(f"current_delay_minutes must be numeric, got '{delay}'.")
    if delay < -60:
        raise ETAValidationError(
            f"Delay of {delay} minutes is implausibly early. "
            "Delays must be >= -60 minutes."
        )
    if delay > 24 * 60:
        raise ETAValidationError(
            f"Delay of {delay} minutes exceeds 24 hours. Verify the input."
        )
    return delay


def validate_time_string(time_str: Optional[str], field_name: str = "time") -> bool:
    """
    Checks that a time string is in HH:MM:SS format.
    Returns True if valid, False if None/missing (not an error in this context).
    """
    if time_str is None or str(time_str).strip() in ("None", "", "nan"):
        return False
    parts = str(time_str).split(":")
    if len(parts) != 3:
        raise ETAValidationError(
            f"{field_name} '{time_str}' is not in HH:MM:SS format."
        )
    return True
