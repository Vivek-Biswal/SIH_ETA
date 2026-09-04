"""
Network controller — HTTP-layer orchestration for network endpoints.

Receives validated input from routes, calls NetworkService,
and raises HTTP-level exceptions.  Contains no business logic.
"""

from typing import Optional

from services.network_service import NetworkService
from models.schemas.network import NetworkStatusResponse, RouteCongestionResponse


class NetworkController:
    """Thin controller delegating to NetworkService."""

    def __init__(self, network_service: Optional[NetworkService] = None):
        self._svc = network_service or NetworkService()

    async def get_network_status(self) -> NetworkStatusResponse:
        """Delegate to NetworkService.get_network_status."""
        return self._svc.get_network_status()

    async def get_route_congestion(
        self, route_id: str
    ) -> RouteCongestionResponse:
        """Delegate to NetworkService.get_route_congestion."""
        return self._svc.get_route_congestion(route_id)

    async def get_bottlenecks(self) -> list:
        """Delegate to NetworkService.get_bottlenecks."""
        return self._svc.get_bottlenecks()

    async def run_what_if(self, request_data: dict) -> dict:
        """Delegate to NetworkService.run_what_if."""
        return self._svc.run_what_if(request_data)

    async def run_simulation(self, request_data: dict) -> dict:
        """Delegate to NetworkService.run_simulation."""
        return self._svc.run_simulation(request_data)

    async def get_scenario(self, scenario_id: str) -> dict:
        """Delegate to NetworkService.get_scenario."""
        return self._svc.get_scenario(scenario_id)
