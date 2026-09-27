"""
Network routes — thin FastAPI endpoint definitions.

Each route validates input parameters and delegates to NetworkController.
No Supabase imports, no business logic, no SQL.
"""

from fastapi import APIRouter, HTTPException, Query
import logging

from api.controllers.network_controller import NetworkController

router = APIRouter(prefix="/api/v1/network", tags=["network"])

_controller = NetworkController()


@router.get("/insights")
def get_network_insights(
    q: str = Query("", max_length=20, pattern=r"^[a-zA-Z0-9 ]*$"),
    limit: int = Query(50, ge=1, le=100),
):
    """Search dated station bottlenecks and propagation analysis; never live alerts."""
    try:
        return _controller.get_network_insights(q, limit)
    except (OSError, ValueError, KeyError, TypeError):
        logging.getLogger(__name__).exception("Network analysis is unavailable")
        raise HTTPException(status_code=503, detail="Network analysis is unavailable") from None


@router.get("/status")
async def get_network_status():
    """Get network-wide congestion and delay summary."""
    return await _controller.get_network_status()


@router.get("/routes/{route_id}/congestion")
async def get_route_congestion(route_id: str):
    """Get congestion score for a specific route segment."""
    return await _controller.get_route_congestion(route_id)
