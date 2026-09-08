"""
Delay-Adjusted Baseline Module
================================
Implements the DELAY_ADJUSTED_BASELINE ETA method.

Logic:
    Estimated Arrival = Scheduled Arrival + Current Delay

What this baseline answers:
    "If the train maintains its current delay until the destination,
     when would it arrive?"

Critical Assumptions (must be explicitly stated in all outputs):
    1. The current delay persists unchanged to the destination.
    2. No delay recovery or additional accumulation is modelled.
    3. The delay value must come from a live/real-time source, NOT
       from DA323 historical averages.

Scientific Constraints:
    - DO NOT use DA323 average delay as the 'current delay'.
    - DA323 is historical and aggregated — it does not reflect the
      current train state.
    - Only use delay from: live API, Railpull snapshot, or user-provided input.
"""
from typing import Dict, List, Optional
from .contract import ETARequest, ETAPrediction
from .validators import validate_delay, ETAValidationError
from .schedule_baseline import schedule_baseline, add_delay_to_time


def delay_adjusted_baseline(
    request: ETARequest,
    journeys_lookup: Dict[str, List[Dict]]
) -> ETAPrediction:
    """
    DELAY_ADJUSTED_BASELINE: Adds the current delay to the scheduled arrival.

    Requires:
        request.current_delay_minutes to be a valid numeric value

    Falls back to SCHEDULE_BASELINE if delay is None.

    Args:
        request: ETARequest with train_number, destination_station, current_delay_minutes
        journeys_lookup: dict mapping train_number -> journey_route

    Returns:
        ETAPrediction with prediction_method = "DELAY_ADJUSTED_BASELINE"
    """
    # Validate delay first
    try:
        delay = validate_delay(request.current_delay_minutes)
    except ETAValidationError as e:
        return ETAPrediction(
            train_number=request.train_number,
            destination_station=request.destination_station,
            prediction_method="DELAY_ADJUSTED_BASELINE",
            status="ERROR",
            message=str(e)
        )

    if delay is None:
        # No delay available — fall back to schedule baseline
        base = schedule_baseline(request, journeys_lookup)
        base.prediction_method = "SCHEDULE_BASELINE (delay not provided)"
        base.assumptions.append(
            "No current delay was provided; schedule baseline was used instead."
        )
        return base

    # Get the schedule baseline first as the foundation
    base = schedule_baseline(request, journeys_lookup)

    if base.status != "OK":
        # Cannot adjust what we cannot retrieve
        return base

    # Apply the delay offset
    adjusted_arrival = add_delay_to_time(base.scheduled_arrival, delay)

    # Handle day boundary: if delay pushes past midnight (60*24 minutes),
    # increment the predicted day
    from .schedule_baseline import time_str_to_minutes
    sched_mins = time_str_to_minutes(base.scheduled_arrival) or 0
    adjusted_mins = sched_mins + int(delay)
    predicted_day = base.scheduled_day

    if predicted_day is not None and adjusted_mins >= 24 * 60:
        # How many full extra days did we overflow?
        extra_days = adjusted_mins // (24 * 60)
        # Only add extra days if original schedule was within day 1 window
        if sched_mins < 24 * 60:
            predicted_day = (predicted_day or 1) + extra_days

    return ETAPrediction(
        train_number=base.train_number,
        destination_station=base.destination_station,
        scheduled_arrival=base.scheduled_arrival,
        scheduled_day=base.scheduled_day,
        predicted_arrival=adjusted_arrival,
        predicted_day=predicted_day,
        current_delay_minutes=delay,
        prediction_method="DELAY_ADJUSTED_BASELINE",
        status="OK",
        assumptions=[
            f"Current delay of {delay} minutes is assumed to persist to the destination.",
            "No delay recovery or additional delay accumulation is modelled.",
            "The delay value must come from a live/real-time source (not DA323 averages).",
            "Day overflow is handled when delay pushes arrival past midnight.",
        ]
    )
