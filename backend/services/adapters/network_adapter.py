"""
Network Intelligence Adapter — integration point for graph-based analysis.
Delegates to the configured NetworkProvider from the factory.
"""

import logging
from typing import Optional

from services.providers.factory import get_network_provider

logger = logging.getLogger(__name__)


class NetworkIntelligenceAdapter:
    """
    Adapter bridging the backend service layer to the Network Intelligence module.
    """

    def __init__(self):
        self._provider = get_network_provider()

    def get_route_congestion_score(
        self, route_id: str
    ) -> Optional[dict]:
        """Request a congestion score for a route segment from the network model."""
        # For now, returning None matches original behavior. Can be updated when ML team specifies the method
        return None

    def get_propagation(self, train_id: str) -> dict:
        """Request delay propagation analysis."""
        return self._provider.get_propagation(train_id)

    def get_bottlenecks(self) -> list[dict]:
        """Request network bottlenecks."""
        return self._provider.get_bottlenecks()

    def run_what_if(self, request_data: dict) -> dict:
        """Run what-if scenario."""
        return self._provider.run_what_if(request_data)

    def run_simulation(self, request_data: dict) -> dict:
        """Run simulation."""
        return self._provider.run_simulation(request_data)

    def get_scenario(self, scenario_id: str) -> dict:
        """Get scenario results."""
        return self._provider.get_scenario(scenario_id)
