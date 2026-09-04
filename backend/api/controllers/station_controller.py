"""
Station controller — HTTP-layer orchestration for station endpoints.

Receives validated input from routes, calls StationService,
and raises HTTP-level exceptions.  Contains no business logic.
"""

from typing import Optional

from services.station_service import StationService
from api.exceptions import NotFoundError
from models.schemas.stations import StationSearchResponse, StationDetail


class StationController:
    """Thin controller delegating to StationService."""

    def __init__(self, station_service: Optional[StationService] = None):
        self._svc = station_service or StationService()

    async def search_stations(self, q: str) -> StationSearchResponse:
        """Delegate to StationService.search_stations."""
        return self._svc.search_stations(q)

    async def get_station(self, station_code: str) -> StationDetail:
        """Delegate to StationService.get_station, raise 404 if missing."""
        result = self._svc.get_station(station_code)
        if result is None:
            raise NotFoundError(f"Station {station_code} not found")
        return result
