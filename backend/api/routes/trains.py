"""
Train routes — thin FastAPI endpoint definitions.

Each route validates input parameters and delegates to TrainController.
No Supabase imports, no business logic, no SQL.
"""

from typing import Optional

from fastapi import APIRouter, Query

from api.controllers.train_controller import TrainController

router = APIRouter(prefix="/api/v1/trains", tags=["trains"])

# Module-level controller instance (simple DI — no framework needed)
_controller = TrainController()


@router.get("/search")
async def search_trains(
    from_station: str = Query(
        ..., min_length=2, max_length=10, description="Source station code"
    ),
    to_station: str = Query(
        ..., min_length=2, max_length=10, description="Destination station code"
    ),
    date: Optional[str] = Query(
        None, description="Travel date (ISO 8601). Defaults to today."
    ),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Search trains running between two stations."""
    return await _controller.search_trains(
        from_station, to_station, date, page, limit
    )


@router.get("/{train_number}/status")
async def get_train_status(
    train_number: str,
    date: Optional[str] = Query(
        None, description="Date for status. Defaults to today."
    ),
):
    """Get the live running status of a train."""
    return await _controller.get_train_status(train_number, date)


@router.get("/{train_number}/eta")
async def get_train_eta(
    train_number: str,
    date: Optional[str] = Query(
        None, description="Date for ETA prediction. Defaults to today."
    ),
):
    """Get ML-predicted ETA for remaining stations on the train's route."""
    return await _controller.get_train_eta(train_number, date)
