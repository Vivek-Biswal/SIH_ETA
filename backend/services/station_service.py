"""
Station service — business logic for station search and lookup.

Depends on StationRepository for data access.
"""

from typing import Optional

from repositories.station_repository import StationRepository
from models.schemas.stations import StationDetail, StationSearchResponse
from models.schemas.common import StationRef


class StationService:
    """Orchestrates station search and detail retrieval."""

    def __init__(self, station_repo: Optional[StationRepository] = None):
        self._repo = station_repo or StationRepository()

    def search_stations(self, query: str) -> StationSearchResponse:
        """
        Search stations by code prefix and name substring.
        Results are merged and deduplicated.
        """
        by_code = self._repo.search_by_code_prefix(query)
        by_name = self._repo.search_by_name(query)

        seen: set[str] = set()
        results: list[StationRef] = []
        for row in by_code + by_name:
            if row["code"] not in seen:
                seen.add(row["code"])
                results.append(StationRef(code=row["code"], name=row["name"]))

        return StationSearchResponse(results=results)

    def get_station(self, station_code: str) -> Optional[StationDetail]:
        """
        Get full station details by code.

        Returns None if the station does not exist (caller raises 404).
        """
        row = self._repo.get_by_code(station_code)
        if not row:
            return None
        return StationDetail(**row)
