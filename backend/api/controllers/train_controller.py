"""
Train controller — HTTP-layer orchestration for train endpoints.

Receives validated input from routes, calls the appropriate service,
and raises HTTP-level exceptions.  Contains no business logic.
"""

from typing import Optional

from services.train_service import TrainService
from services.eta_service import ETAService
from api.exceptions import NotFoundError
from models.schemas.trains import TrainSearchResponse, TrainStatusResponse, ETAResponse


class TrainController:
    """Thin controller delegating to TrainService and ETAService."""

    def __init__(
        self,
        train_service: Optional[TrainService] = None,
        eta_service: Optional[ETAService] = None,
    ):
        self._train_svc = train_service or TrainService()
        self._eta_svc = eta_service or ETAService()

    async def search_trains(
        self,
        from_station: str,
        to_station: str,
        date: Optional[str],
        page: int,
        limit: int,
    ) -> TrainSearchResponse:
        """Delegate to TrainService.search_trains."""
        return self._train_svc.search_trains(
            from_station, to_station, date, page, limit
        )

    async def get_train_status(
        self, train_number: str, date: Optional[str]
    ) -> TrainStatusResponse:
        """Delegate to TrainService.get_train_status, raise 404 if missing."""
        result = self._train_svc.get_train_status(train_number, date)
        if result is None:
            raise NotFoundError(f"Train {train_number} not found")
        return result

    async def get_train_eta(
        self, train_number: str, date: Optional[str]
    ) -> ETAResponse:
        """Delegate to ETAService.get_train_eta, raise 404 if missing."""
        result = self._eta_svc.get_train_eta(train_number, date)
        if result is None:
            raise NotFoundError(f"Train {train_number} not found")
        return result

    async def get_delay_dna(self, train_number: str) -> dict:
        """Delegate to ETAService.get_delay_dna."""
        return self._eta_svc.get_delay_dna(train_number)

    async def get_recovery(self, train_number: str) -> dict:
        """Delegate to ETAService.get_recovery."""
        return self._eta_svc.get_recovery(train_number)

    async def get_propagation(self, train_number: str) -> dict:
        """Delegate to ETAService.get_propagation."""
        return self._eta_svc.get_propagation(train_number)
