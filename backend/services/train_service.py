"""
Train service — business logic for train search and live status.

Depends on TrainRepository for data access. Never imports database.connection.
"""

from typing import Optional

from repositories.train_repository import TrainRepository
from models.schemas.trains import (
    TrainSearchResponse,
    TrainSummary,
    TrainStatusResponse,
    LastKnownLocation,
    StationRunningStatus,
)
from models.schemas.common import StationRef


class TrainService:
    """Orchestrates train search and status retrieval."""

    def __init__(self, train_repo: Optional[TrainRepository] = None):
        self._repo = train_repo or TrainRepository()

    # ── Search ───────────────────────────────────────────────────────────

    def search_trains(
        self,
        from_station: str,
        to_station: str,
        date: Optional[str],
        page: int,
        limit: int,
    ) -> TrainSearchResponse:
        """Search trains between two stations with pagination."""
        offset = (page - 1) * limit
        rows, total = self._repo.search_trains(
            from_station, to_station, offset, limit
        )

        trains = [
            TrainSummary(
                train_number=row["train_number"],
                train_name=row["train_name"],
                from_station=row.get("from_station_ref"),
                to_station=row.get("to_station_ref"),
                departure_time=row.get("departure_time"),
                arrival_time=row.get("arrival_time"),
                days_of_run=row.get("days_of_run"),
                train_type=row.get("train_type"),
            )
            for row in rows
        ]

        return TrainSearchResponse(
            total=total,
            page=page,
            limit=limit,
            trains=trains,
        )

    # ── Live status ──────────────────────────────────────────────────────

    def get_train_status(
        self, train_number: str, date: Optional[str]
    ) -> Optional[TrainStatusResponse]:
        """
        Build the full live running status for a train.

        Returns None if the train does not exist (caller raises 404).
        """
        train = self._repo.get_train_by_number(train_number)
        if not train:
            return None

        journey = self._repo.get_latest_journey(train_number, date)
        state = self._extract_state(journey)

        # Resolve current station name
        current_station = None
        if state and state.get("current_station_code"):
            stn = self._repo.get_station_ref(state["current_station_code"])
            if stn:
                current_station = StationRef(**stn)

        # Build route with observations merged in
        route = self._build_route(train_number, journey)

        return TrainStatusResponse(
            train_number=train["train_number"],
            train_name=train["train_name"],
            date=journey["start_date"] if journey else None,
            current_station=current_station,
            last_known_location=LastKnownLocation(
                station=current_station,
                delay_minutes=state["delay_minutes"] if state else 0,
                updated_at=state.get("updated_at") if state else None,
            ) if state else None,
            overall_delay_minutes=state["delay_minutes"] if state else 0,
            status=journey["status"] if journey else "not_started",
            route=route,
        )

    # ── Private helpers ──────────────────────────────────────────────────

    @staticmethod
    def _extract_state(journey: Optional[dict]) -> Optional[dict]:
        """Extract the train_states record from a journey join."""
        if not journey:
            return None
        states = journey.get("train_states")
        if not states:
            return None
        return states[0] if isinstance(states, list) else states

    def _build_route(
        self, train_number: str, journey: Optional[dict]
    ) -> list[StationRunningStatus]:
        """Merge schedule stops with actual observations."""
        schedule = self._repo.get_schedule(train_number)

        observations: dict[str, dict] = {}
        if journey:
            for obs in self._repo.get_station_observations(journey["id"]):
                observations[obs["station_code"]] = obs

        route = []
        for stop in schedule:
            stn_code = stop.get("station_code")
            obs = observations.get(stn_code, {})
            route.append(
                StationRunningStatus(
                    station=stop.get("station"),
                    scheduled_arrival=stop.get("scheduled_arrival"),
                    scheduled_departure=stop.get("scheduled_departure"),
                    actual_arrival=obs.get("act_arr"),
                    actual_departure=obs.get("act_dep"),
                    delay_minutes=obs.get("arr_delay"),
                    has_departed=obs.get("act_dep") is not None,
                    platform=None,
                )
            )
        return route
