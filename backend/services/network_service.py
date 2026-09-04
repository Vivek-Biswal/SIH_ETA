"""
Network service — business logic for network status and route congestion.

Depends on NetworkRepository and NetworkIntelligenceAdapter.
"""

from typing import Optional

from repositories.network_repository import NetworkRepository
from services.adapters.network_adapter import NetworkIntelligenceAdapter
from models.schemas.network import (
    NetworkStatusResponse,
    CongestionHotspot,
    RouteCongestionResponse,
)


class NetworkService:
    """Orchestrates network-wide health assessment and route congestion."""

    def __init__(
        self,
        network_repo: Optional[NetworkRepository] = None,
        network_adapter: Optional[NetworkIntelligenceAdapter] = None,
    ):
        self._repo = network_repo or NetworkRepository()
        self._adapter = network_adapter or NetworkIntelligenceAdapter()

    # ── Network status ───────────────────────────────────────────────────

    def get_network_status(self) -> NetworkStatusResponse:
        """Compute network-wide delay summary and congestion hotspots."""
        running = self._repo.get_running_journeys()
        active_trains = len(running)

        delayed_trains = self._count_delayed(running)
        delay_pct = (
            (delayed_trains / active_trains * 100) if active_trains > 0 else 0.0
        )
        overall_health = self._classify_health(delay_pct)

        hotspots = self._build_hotspots()

        return NetworkStatusResponse(
            timestamp=None,
            overall_health=overall_health,
            active_trains=active_trains,
            delayed_trains=delayed_trains,
            delay_percentage=round(delay_pct, 2),
            congestion_hotspots=hotspots,
        )

    # ── Route congestion ─────────────────────────────────────────────────

    def get_route_congestion(self, route_id: str) -> RouteCongestionResponse:
        """
        Get congestion data for a specific route.

        Tries the intelligence adapter first; if unavailable, returns defaults.
        """
        result = self._adapter.get_route_congestion_score(route_id)

        if result:
            return RouteCongestionResponse(
                route_id=route_id,
                congestion_score=result.get("congestion_score", 0.0),
                average_delay_minutes=result.get("average_delay_minutes", 0),
                timestamp=result.get("timestamp"),
            )

        # Fallback — intelligence module not available
        return RouteCongestionResponse(
            route_id=route_id,
            congestion_score=0.0,
            average_delay_minutes=0,
            timestamp=None,
        )

    # ── Private helpers ──────────────────────────────────────────────────

    @staticmethod
    def _count_delayed(journeys: list[dict]) -> int:
        """Count journeys whose current delay > 0."""
        delayed = 0
        for j in journeys:
            states = j.get("train_states")
            if states:
                s = states[0] if isinstance(states, list) else states
                if s.get("delay_minutes", 0) > 0:
                    delayed += 1
        return delayed

    @staticmethod
    def _classify_health(delay_percentage: float) -> str:
        """Classify network health based on percentage of delayed trains."""
        if delay_percentage > 50:
            return "severely_congested"
        elif delay_percentage > 20:
            return "moderately_congested"
        return "normal"

    def _build_hotspots(self) -> list[CongestionHotspot]:
        """Build congestion hotspot list from bottleneck data."""
        bottlenecks = self._repo.get_bottleneck_hotspots()
        hotspots = []
        for b in bottlenecks:
            risk = b["risk_score"]
            if risk >= 0.9:
                level = "critical"
            elif risk >= 0.7:
                level = "high"
            else:
                level = "medium"

            station_info = b.get("station", {})
            segment_name = station_info.get("name", b.get("station_code", "Unknown"))

            hotspots.append(
                CongestionHotspot(
                    route_segment=segment_name,
                    congestion_level=level,
                    affected_trains=b.get("active_train_count", 0),
                    average_delay_minutes=0,
                )
            )
        return hotspots

    def get_bottlenecks(self) -> list:
        """Delegate to NetworkIntelligenceAdapter for Bottlenecks."""
        return self._adapter.get_bottlenecks()

    def run_what_if(self, request_data: dict) -> dict:
        """Delegate to NetworkIntelligenceAdapter for what-if scenario."""
        return self._adapter.run_what_if(request_data)

    def run_simulation(self, request_data: dict) -> dict:
        """Delegate to NetworkIntelligenceAdapter for simulation."""
        return self._adapter.run_simulation(request_data)

    def get_scenario(self, scenario_id: str) -> dict:
        """Delegate to NetworkIntelligenceAdapter for scenario results."""
        return self._adapter.get_scenario(scenario_id)
