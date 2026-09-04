"""
Network routes — thin FastAPI endpoint definitions.

Each route validates input parameters and delegates to NetworkController.
No Supabase imports, no business logic, no SQL.
"""

from fastapi import APIRouter

from api.controllers.network_controller import NetworkController

router = APIRouter(prefix="/api/v1/network", tags=["network"])

_controller = NetworkController()


@router.get("/status")
async def get_network_status():
    """Get network-wide congestion and delay summary."""
    return await _controller.get_network_status()


@router.get("/routes/{route_id}/congestion")
async def get_route_congestion(route_id: str):
    """Get congestion score for a specific route segment."""
    return await _controller.get_route_congestion(route_id)
