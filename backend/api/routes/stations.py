"""
Station routes — thin FastAPI endpoint definitions.

Each route validates input parameters and delegates to StationController.
No Supabase imports, no business logic, no SQL.
"""

from fastapi import APIRouter, Query

from api.controllers.station_controller import StationController

router = APIRouter(prefix="/api/v1/stations", tags=["stations"])

_controller = StationController()


@router.get("/search")
async def search_stations(
    q: str = Query(
        ..., min_length=2, description="Station name or code prefix"
    ),
):
    """Search stations by name or code."""
    return await _controller.search_stations(q)


@router.get("/{station_code}")
async def get_station(station_code: str):
    """Get full details for a specific station by its code."""
    return await _controller.get_station(station_code)
