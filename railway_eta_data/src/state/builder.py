"""
State Builder Module
====================
Builds the unified `TrainState` from various data sources.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from .contract import TrainState, DataAvailability
from .validators import validate_train_number, validate_destination, StateValidationError

class TrainStateBuilder:
    """
    Builds a TrainState object by integrating metadata, scheduled journey,
    live delay (if available), and historical context.
    """
    def __init__(
        self,
        trains_lookup: Dict[str, Dict[str, Any]],
        journeys_lookup: Dict[str, List[Dict[str, Any]]],
        historical_lookup: Dict[str, Dict[str, Any]],
        live_delays_lookup: Dict[str, Dict[str, Any]] = None
    ):
        self.trains_lookup = trains_lookup
        self.journeys_lookup = journeys_lookup
        self.historical_lookup = historical_lookup
        self.live_delays_lookup = live_delays_lookup or {}

    def build(
        self,
        train_number: str,
        destination_station: Optional[str] = None,
        request_timestamp: Optional[str] = None,
        provided_delay_minutes: Optional[float] = None
    ) -> TrainState:
        """
        Constructs the TrainState.
        """
        train_number = validate_train_number(train_number)
        
        if not request_timestamp:
            request_timestamp = datetime.now(timezone.utc).isoformat()

        state = TrainState(
            train_number=train_number,
            state_timestamp=request_timestamp
        )

        # 1. Train Metadata
        train_meta = self.trains_lookup.get(train_number)
        if train_meta:
            state.train_type = train_meta.get("type_canonical") or train_meta.get("type")
            state.train_type_availability = DataAvailability("AVAILABLE", source="trains_clean.json")
            try:
                state.route_distance = float(train_meta.get("distance", 0)) or None
                state.route_availability = DataAvailability("AVAILABLE", source="trains_clean.json")
            except (TypeError, ValueError):
                pass
        else:
            raise StateValidationError(f"Train {train_number} not found in static metadata.")

        # 2. Scheduled Journey
        journey = self.journeys_lookup.get(train_number)
        if journey:
            state.scheduled_journey = journey
            state.journey_availability = DataAvailability("AVAILABLE", source="journeys_scheduled.json")
        else:
            raise StateValidationError(f"Scheduled journey not found for train {train_number}.")

        # 3. Destination Validation
        if destination_station:
            destination_station = destination_station.upper().strip()
            validate_destination(destination_station, journey)
            state.destination_station = destination_station
            state.destination_availability = DataAvailability("AVAILABLE", source="user_request")
        else:
             # Default to last station in journey
             state.destination_station = journey[-1].get("station", "").upper()
             state.destination_availability = DataAvailability("AVAILABLE", source="inferred_from_schedule")

        # 4. Live Context (Delay)
        if provided_delay_minutes is not None:
             state.current_delay_minutes = provided_delay_minutes
             state.delay_timestamp = request_timestamp
             state.delay_availability = DataAvailability("AVAILABLE", source="user_request")
        else:
            live_delay = self.live_delays_lookup.get(train_number)
            if live_delay and live_delay.get("delay_min") is not None:
                state.current_delay_minutes = float(live_delay["delay_min"])
                state.delay_timestamp = live_delay.get("snapshot_ts")
                state.delay_availability = DataAvailability("AVAILABLE", source="delays_clean.json (snapshot)")

        # 5. Historical Context (for destination)
        if state.destination_station:
            hist_ctx = self.historical_lookup.get(state.destination_station)
            if hist_ctx:
                 state.historical_station_context = hist_ctx
                 state.historical_availability = DataAvailability(
                     "TEMPORALLY_UNSAFE",
                     source="public_historical_delay_clean.csv",
                     limitations=["Temporal provenance unknown. May cause leakage if used for ML."]
                 )
        
        return state
